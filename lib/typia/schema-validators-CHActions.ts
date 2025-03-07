import 'server-only';
import typia from 'typia';
import type { CHActions } from '../api'; // type-only import

type Params_getTraces = Parameters<CHActions["getTraces"]>;
type Return_getTraces = Awaited<ReturnType<CHActions["getTraces"]>>;
type Params_getTraceDetail = Parameters<CHActions["getTraceDetail"]>;
type Return_getTraceDetail = Awaited<ReturnType<CHActions["getTraceDetail"]>>;
type Params_getFilterOptions = Parameters<CHActions["getFilterOptions"]>;
type Return_getFilterOptions = Awaited<ReturnType<CHActions["getFilterOptions"]>>;

// ---------------- ValidateAndLog snippet ----------------
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('db-actions');

/**
 * Decorator that wraps methods with:
 * - Parameter & return validation (via `typia.is`)
 * - OpenTelemetry tracing (creates or continues a Span)
 * - Attaches the relevant schemas as trace attributes
 */
export function ValidateAndLog(target: any, methodName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    // Possibly continue an existing trace context
    const activeCtx = context.active();
    const span = tracer.startSpan(`CHActions.${methodName}`, undefined, activeCtx);

    // Retrieve paramSchema & returnSchema from imported schemas
    const { paramSchema, returnSchema } = schemas[methodName as keyof typeof schemas] || {};

    try {
      // Attach the generated schemas to the span for debugging
      if (paramSchema) {
        span.setAttribute(`schemas.${methodName}.param`, JSON.stringify(paramSchema.schemas[0]));
      }
      if (returnSchema) {
        span.setAttribute(`schemas.${methodName}.return`, JSON.stringify(returnSchema.schemas[0]));
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


// ---------------- Method Return / Param Maps -------------

const methodReturnTypeMap = {
  'getTraces': typia.json.schemas<[Return_getTraces], "3.1">(),
  'getTraceDetail': typia.json.schemas<[Return_getTraceDetail], "3.1">(),
  'getFilterOptions': typia.json.schemas<[Return_getFilterOptions], "3.1">(),
} as const;

const methodParamTypeMap = {
  'getTraces': typia.json.schemas<[Params_getTraces], "3.1">(),
  'getTraceDetail': typia.json.schemas<[Params_getTraceDetail], "3.1">(),
  'getFilterOptions': typia.json.schemas<[Params_getFilterOptions], "3.1">(),
} as const;

// ---------------- schemas object merging both maps -------------
export const schemas = {
  getTraces: {
    paramSchema: methodParamTypeMap['getTraces'],
    returnSchema: methodReturnTypeMap['getTraces']
  },
  getTraceDetail: {
    paramSchema: methodParamTypeMap['getTraceDetail'],
    returnSchema: methodReturnTypeMap['getTraceDetail']
  },
  getFilterOptions: {
    paramSchema: methodParamTypeMap['getFilterOptions'],
    returnSchema: methodReturnTypeMap['getFilterOptions']
  },
} as const;

// ---------------- Additional Exports -----------------------

export const paramSchemas = Object.entries(methodParamTypeMap).map(([key, schema]) => ({ key, schema }));
export const returnSchemas = Object.entries(methodReturnTypeMap).map(([key, schema]) => ({ key, schema }));
export const validatorsByName = Object.keys(methodParamTypeMap);

