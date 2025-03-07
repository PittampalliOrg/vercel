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
// 2) Generate one “schema-validators-<ClassName>.ts” output for a single file.
//
function generateSchemaValidatorsForFile(tsFilePath: string, outDir: string, project: Project) {
  // Parse the file
  const sourceFile = project.addSourceFileAtPath(tsFilePath);

  // Find exactly one class in this file
  const allClasses = sourceFile.getClasses();
  if (allClasses.length === 0) {
    throw new Error(`No classes found in file: ${tsFilePath}`);
  }
  if (allClasses.length > 1) {
    throw new Error(`Multiple classes found in file: ${tsFilePath}. This script assumes exactly one class per file.`);
  }

  const targetClass = allClasses[0];
  const className = targetClass.getName();
  if (!className) {
    throw new Error(`Unnamed class found in file: ${tsFilePath}`);
  }

  // Collect all method info
  const methodNames: string[] = [];
  const paramSchemasByMethod: Record<string, string> = {};
  const returnSchemasByMethod: Record<string, string> = {};

  for (const method of targetClass.getMethods()) {
    const methodName = method.getName();
    if (methodName === 'constructor') continue;

    methodNames.push(methodName);

    // Evaluate param schemas
    const paramBad = isProblematicParameterType(method);
    if (paramBad) {
      paramSchemasByMethod[methodName] = `undefined /* Problematic param */`;
    } else {
      // e.g. => typia.json.schemas<[Params_${methodName}], "3.1">()
      paramSchemasByMethod[methodName] =
        `typia.json.schemas<[Params_${methodName}], "3.1">()`;
    }

    // Evaluate return schemas
    const returnBad = isProblematicReturnType(method);
    if (returnBad) {
      returnSchemasByMethod[methodName] = `undefined /* Problematic return */`;
    } else {
      // e.g. => typia.json.schemas<[Return_${methodName}], "3.1">()
      returnSchemasByMethod[methodName] =
        `typia.json.schemas<[Return_${methodName}], "3.1">()`;
    }
  }

  // Build the “ValidateAndLog” snippet
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
    const span = tracer.startSpan(\`${className}.\${methodName}\`, undefined, activeCtx);

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
  // Build up the final code string
  //

  // 2a) Compute the relative import path for the original file
  //     (Strip ".ts" from the end, handle Windows backslashes, etc.)
  const outFile = path.resolve(outDir, `schema-validators-${className}.ts`);
  const relativeImportPath = path
    .relative(path.dirname(outFile), tsFilePath)
    .replace(/\\/g, '/')  // handle Windows backslash
    .replace(/\.ts$/, '');

  // 2b) File header with “server-only”, typia, and dynamic import
  let fileHeader = `import 'server-only';
import typia from 'typia';
import type { ${className} } from '${relativeImportPath}'; // type-only import
`;

  // 2c) Add type aliases for each method
  for (const m of methodNames) {
    fileHeader += `\ntype Params_${m} = Parameters<${className}["${m}"]>;`;
    fileHeader += `\ntype Return_${m} = Awaited<ReturnType<${className}["${m}"]>>;`;
  }

  // 2d) Helper function to build method-Map code
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

  // 2e) The combined schemas object
  let schemasObjectCode = `export const schemas = {\n`;
  for (const m of methodNames) {
    schemasObjectCode += `  ${m}: {
    paramSchema: methodParamTypeMap['${m}'],
    returnSchema: methodReturnTypeMap['${m}']
  },\n`;
  }
  schemasObjectCode += `} as const;`;

  // 2f) Additional exports
  const finalExports = `
export const paramSchemas = Object.entries(methodParamTypeMap).map(([key, schema]) => ({ key, schema }));
export const returnSchemas = Object.entries(methodReturnTypeMap).map(([key, schema]) => ({ key, schema }));
export const validatorsByName = Object.keys(methodParamTypeMap);
`;

  // 2g) Combine everything
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

  // 2h) Write the file
  fs.writeFileSync(outFile, finalCode, 'utf8');
  console.log(`Generated schema-validators-${className}.ts successfully!`);
}

//
// 3) Example driver: generate for multiple input files
//
function main() {
  // Initialize ts-morph with your tsconfig
  const project = new Project({
    tsConfigFilePath: './tsconfig.json',
  });

  // Suppose you want to generate for these files:
  const inputFiles = [
    './lib/db/queries.ts',        // single class: “DbActions”
    './lib/clickhouse.ts',      // single class: “OtherDbClass”
    // etc...
  ];

  // All outputs go in ./lib/typia
  const outDir = './lib/typia';

  for (const filePath of inputFiles) {
    generateSchemaValidatorsForFile(filePath, outDir, project);
  }
}

main();
