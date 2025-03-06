// lib/generator.ts
import { Project, Type, MethodDeclaration } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

//
// 1) Utility checks for “problematic” param/return types (like never or RowList<never>).
//
function includesNever(type: Type): boolean {
  if (type.isNever()) return true;
  if (type.isUnion()) {
    return type.getUnionTypes().some((u) => includesNever(u));
  }
  if (type.isIntersection()) {
    return type.getIntersectionTypes().some((i) => includesNever(i));
  }
  return false;
}

function isProblematicType(type: Type): boolean {
  const text = type.getText();
  if (
    text.includes('RowList<never') ||
    text.includes('Iterable<never') ||
    text.includes('nonsensible intersection') ||
    text.includes('postgres.ResultQueryMeta')
  ) {
    return true;
  }
  if (includesNever(type)) {
    return true;
  }
  return false;
}

function isProblematicReturnType(method: MethodDeclaration): boolean {
  const returnType = method.getReturnType();
  return isProblematicType(returnType);
}

function isProblematicParameterType(method: MethodDeclaration): boolean {
  for (const paramDecl of method.getParameters()) {
    if (isProblematicType(paramDecl.getType())) {
      return true;
    }
  }
  return false;
}

//
// 2) Initialize ts-morph, parse queries.ts, find DbActions, gather methods
//
const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});
const sourceFile = project.addSourceFileAtPath('./lib/db/queries.ts');
const dbActionsClass = sourceFile.getClass('DbActions');
if (!dbActionsClass) {
  throw new Error('DbActions class not found in ./lib/db/queries.ts');
}

//
// 3) Build a method list, plus param & return schema code snippet for each
//
const methodNames: string[] = [];
const paramSchemasByMethod: Record<string, string> = {};
const returnSchemasByMethod: Record<string, string> = {};

for (const method of dbActionsClass.getMethods()) {
  const methodName = method.getName();
  if (methodName === 'constructor') continue;

  methodNames.push(methodName);

  // For param schemas
  const paramBad = isProblematicParameterType(method);
  if (paramBad) {
    paramSchemasByMethod[methodName] = `undefined /* Problematic param */`;
  } else {
    // e.g. type Params_getUser = Parameters<DbActions["getUser"]>;
    //      => typia.json.schemas<[Params_getUser], "3.1">()
    paramSchemasByMethod[methodName] =
      `typia.json.schemas<[Params_${methodName}], "3.1">()`;
  }

  // For return schemas
  const returnBad = isProblematicReturnType(method);
  if (returnBad) {
    returnSchemasByMethod[methodName] = `undefined /* Problematic return */`;
  } else {
    // e.g. type Return_getUser = Awaited<ReturnType<DbActions["getUser"]>>;
    //      => typia.json.schemas<[Return_getUser], "3.1">()
    returnSchemasByMethod[methodName] =
      `typia.json.schemas<[Return_${methodName}], "3.1">()`;
  }
}

//
// 4) The ValidateAndLog snippet we want to inject into the final file.
//
const validateAndLogSnippet = `\
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('db-actions');

/**
 * Decorator that wraps methods with:
 * - Parameter & return validation (via \`typia.is\`)
 * - OpenTelemetry tracing (creates or continues a Span)
 * - Attaches the relevant schemas as trace attributes
 */
export function ValidateAndLog(target: any, methodName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    // Possibly continue an existing trace context
    const activeCtx = context.active();
    const span = tracer.startSpan(\`DbActions.\${methodName}\`, undefined, activeCtx);

    // Retrieve paramSchema & returnSchema from imported schemas
    const { paramSchema, returnSchema } = schemas[methodName as keyof typeof schemas] || {};

    try {
      // Attach the generated schemas to the span for debugging
      if (paramSchema) {
        span.setAttribute(\`schemas.\${methodName}.param\`, JSON.stringify(paramSchema.schemas[0]));
      }
      if (returnSchema) {
        span.setAttribute(\`schemas.\${methodName}.return\`, JSON.stringify(returnSchema.schemas[0]));
      }

      // Parameter validation
      if (paramSchema) {
        const paramValidation = typia.is(args);
        span.addEvent('Parameter Validation', {
          expected: JSON.stringify(paramSchema.schemas[0]),
          received: JSON.stringify(args),
          validationPassed: paramValidation,
        });
      }

      // Invoke the original method
      const result = await originalMethod.apply(this, args);

      // Return validation
      if (returnSchema) {
        const resultValidation = typia.is(result);
        span.addEvent('Return Validation', {
          expected: JSON.stringify(returnSchema.schemas[0]),
          received: JSON.stringify(result),
          validationPassed: resultValidation,
        });
        span.setAttribute('return.result', JSON.stringify(result));
      }

      return result;
    } catch (error: any) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });
      throw error;
    } finally {
      span.end();
    }
  };
}
`;

//
// 5) Build the type aliases and the methodReturnTypeMap / methodParamTypeMap code
//
let fileHeader = `import 'server-only';
import typia from 'typia';
import type { DbActions } from '../db/queries'; // type-only import
`;

// Type aliases for each method
for (const m of methodNames) {
  fileHeader += `\ntype Params_${m} = Parameters<DbActions["${m}"]>;`;
  fileHeader += `\ntype Return_${m} = Awaited<ReturnType<DbActions["${m}"]>>;`;
}

function makeMapCode(
  methods: string[],
  snippetMap: Record<string, string>,
  varName: string
) {
  return `
const ${varName} = {
${methods.map((m) => `  '${m}': ${snippetMap[m]},`).join('\n')}
} as const;`;
}

const methodReturnTypeMapCode = makeMapCode(methodNames, returnSchemasByMethod, 'methodReturnTypeMap');
const methodParamTypeMapCode = makeMapCode(methodNames, paramSchemasByMethod, 'methodParamTypeMap');

// The merged "schemas" object
let schemasObjectCode = `export const schemas = {\n`;
for (const m of methodNames) {
  schemasObjectCode += `  ${m}: {
    paramSchema: methodParamTypeMap['${m}'],
    returnSchema: methodReturnTypeMap['${m}']
  },\n`;
}
schemasObjectCode += `} as const;`;

const finalExports = `
export const paramSchemas = Object.entries(methodParamTypeMap).map(([key, schema]) => ({ key, schema }));
export const returnSchemas = Object.entries(methodReturnTypeMap).map(([key, schema]) => ({ key, schema }));
export const validatorsByName = Object.keys(methodParamTypeMap);
`;

//
// 6) Combine everything into final code
//
const finalCode = `\
${fileHeader}

// ---------------- ValidateAndLog snippet ----------------
${validateAndLogSnippet}

// ---------------- Method Return / Param Maps -------------
${methodReturnTypeMapCode}
${methodParamTypeMapCode}

// ---------------- schemas object merging both maps -------------
${schemasObjectCode}

// ---------------- Additional Exports -----------------------
${finalExports}
`;

//
// 7) Write out schema-validators.ts
//
const outFile = path.resolve('./lib/typia/schema-validators.ts');
fs.writeFileSync(outFile, finalCode, 'utf8');
console.log('Generated schema-validators.ts successfully!');
