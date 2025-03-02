import 'reflect-metadata';  // Make sure this is imported

import { trace, Span, SpanOptions } from '@opentelemetry/api';

const tracer = trace.getTracer('my-instrumentation');

// The decorator function for wrapping methods and adding metadata
export function TraceFunction(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    // Get design-time metadata (types of parameters and return type)
    const designParamTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey);
    const designReturnType = Reflect.getMetadata('design:returntype', target, propertyKey);

    // Start the span with metadata
    const span = tracer.startSpan(propertyKey);

    try {
      // Attach metadata to the span
      span.setAttribute('function', propertyKey);
      span.setAttribute('parameters', JSON.stringify(args));
      span.setAttribute('paramTypes', JSON.stringify(designParamTypes));
      span.setAttribute('returnType', designReturnType?.name || 'unknown');

      // Call the original method
      const result = await originalMethod.apply(this, args);

      // Add the result to the span's metadata
      span.setAttribute('result', JSON.stringify(result));

      // Record success status here
      span.setStatus({ code: 0 }); // OK

      return result;
    } catch (error) {
      // Handle error and update span status
      span.setStatus({ code: 2 }); // ERROR
      if (error instanceof Error) {
        span.recordException(error);
      }

      throw error;
    } finally {
      // End the span after method execution
      span.end();
    }
  };

  return descriptor;
}


// Function-based approach to create spans
export function TraceFunctionFn(name: string, options: SpanOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return tracer.startActiveSpan(name, options, async (span: Span) => {
        try {
          span.setAttribute('function', name);
          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: 0 });
          return result;
        } catch (error) {
          span.setStatus({ code: 2 });
          if (error instanceof Error) {
            span.recordException(error);
          }
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

export const Tracer = tracer;
