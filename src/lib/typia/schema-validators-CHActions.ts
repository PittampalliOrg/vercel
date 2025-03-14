import 'server-only';
import typia from 'typia';
import type { CHActions } from '../clickhouse'; // type-only import

type Params_fetchTraces = Parameters<CHActions["fetchTraces"]>;
type Return_fetchTraces = Awaited<ReturnType<CHActions["fetchTraces"]>>;
type Params_fetchTraceDetail = Parameters<CHActions["fetchTraceDetail"]>;
type Return_fetchTraceDetail = Awaited<ReturnType<CHActions["fetchTraceDetail"]>>;
type Params_fetchFilterOptions = Parameters<CHActions["fetchFilterOptions"]>;
type Return_fetchFilterOptions = Awaited<ReturnType<CHActions["fetchFilterOptions"]>>;

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
  'fetchTraces': typia.json.schemas<[Return_fetchTraces], "3.1">(),
  'fetchTraceDetail': typia.json.schemas<[Return_fetchTraceDetail], "3.1">(),
  'fetchFilterOptions': typia.json.schemas<[Return_fetchFilterOptions], "3.1">(),
} as const;

const methodParamTypeMap = {
  'fetchTraces': typia.json.schemas<[Params_fetchTraces], "3.1">(),
  'fetchTraceDetail': typia.json.schemas<[Params_fetchTraceDetail], "3.1">(),
  'fetchFilterOptions': typia.json.schemas<[Params_fetchFilterOptions], "3.1">(),
} as const;

// ---------------- schemas object merging both maps -------------
export const schemas = {
  fetchTraces: {
    paramSchema: methodParamTypeMap['fetchTraces'],
    returnSchema: methodReturnTypeMap['fetchTraces']
  },
  fetchTraceDetail: {
    paramSchema: methodParamTypeMap['fetchTraceDetail'],
    returnSchema: methodReturnTypeMap['fetchTraceDetail']
  },
  fetchFilterOptions: {
    paramSchema: methodParamTypeMap['fetchFilterOptions'],
    returnSchema: methodReturnTypeMap['fetchFilterOptions']
  },
} as const;

// ---------------- Additional Exports -----------------------

export const paramSchemas = Object.entries(methodParamTypeMap).map(([key, schema]) => ({ key, schema }));
export const returnSchemas = Object.entries(methodReturnTypeMap).map(([key, schema]) => ({ key, schema }));
export const validatorsByName = Object.keys(methodParamTypeMap);

