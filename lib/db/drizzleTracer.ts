// lib/db/drizzleTracer.ts
import type { Span, Tracer } from '@opentelemetry/api';
import * as otel from '@opentelemetry/api';

/**
 * Default base URL for the Jaeger UI.
 * You can change it by calling setDrizzleTracerBaseUrl(...)
 */
let JAEGER_BASE_URL = 'http://127.0.0.1:16686/';

/**
 * Optionally let you configure the base URL for your local Jaeger.
 * For example: setDrizzleTracerBaseUrl("http://my-jaeger:16686")
 */
export function setDrizzleTracerBaseUrl(url: string) {
  JAEGER_BASE_URL = url;
}

/**
 * Internal helper to log span links to the console.
 */
function logSpanLinks(span: Span, spanName: string = '') {
  const { traceId, spanId } = span.spanContext();
  const traceLink = `${JAEGER_BASE_URL}/jaeger/ui/trace/${traceId}`;
  const spanLink = `${JAEGER_BASE_URL}/jaeger/ui/trace/${traceId}?uiFind=${spanId}`;

  // ANSI escape codes for colors
  const blue = "\x1b[34m";
  const reset = "\x1b[0m";

  console.log('\n---------------------------------------------------------');
  console.log('    Jaeger Tracing Links');
  console.log('---------------------------------------------------------');
  
  console.log(` Identifier : ${spanName}`);

  console.log(`  Trace link: ${blue}${traceLink}${reset}`);
  console.log(`   Span link: ${blue}${spanLink}${reset}`);
  console.log('---------------------------------------------------------\n');
}

export const drizzleTracer = {
  startActiveSpan<F extends (span?: Span) => Promise<unknown> | unknown>(
    spanName: string,
    fn: F
  ): ReturnType<F> {
    // If OTel is not available or not set up, just run the function
    if (!otel || !otel.trace) {
      return fn() as ReturnType<F>;
    }

    // If available, get or create a tracer
    const tracer: Tracer = otel.trace.getTracer('drizzle-orm', '1.0.0');

    // Start an active span and run the function
    return tracer.startActiveSpan(spanName, (span: Span) => {
      try {
        // Possibly synchronous or async
        const result = fn(span);

        if (result instanceof Promise) {
          return result
            .then((res) => {
              // End the span
              span.end();
              // Log console links
              logSpanLinks(span, spanName);
              return res;
            })
            .catch((err) => {
              span.recordException(err);
              span.setStatus({ code: otel.SpanStatusCode.ERROR });
              span.end();
              logSpanLinks(span, spanName);
              throw err;
            }) as ReturnType<F>;
        } else {
          // Sync flow
          span.end();
          logSpanLinks(span, spanName);
          return result as ReturnType<F>;
        }
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: otel.SpanStatusCode.ERROR });
        span.end();
        logSpanLinks(span, spanName);
        throw err;
      }
    }) as ReturnType<F>;
  },
};
