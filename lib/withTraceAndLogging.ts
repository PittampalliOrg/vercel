// lib/withTraceAndLogging.ts
import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api';
import { NextResponse } from 'next/server';
import { after } from 'next/server';

// We'll only import stackTrace / fs / path if we detect Node (not Edge).
let stackTrace: any = null;
let fs: any = null;
let path: any = null;

// Simple runtime check:
const isNodeRuntime = process.env.NEXT_RUNTIME !== 'edge';

// If we are in Node, require them
if (isNodeRuntime) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  stackTrace = require('stack-trace');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  path = require('path');
}

/**
 * (Placeholder) Map from compiled .js line/col to .ts line/col (dummy offset).
 */
async function mapOriginalPosition(fileName: string, line: number, column: number) {
  return {
    source: fileName.replace('.js', '.ts'),
    line: line - 2,
    column,
    name: 'dummyFunction',
  };
}

/**
 * Convert a Next.js .next/server path to the original /app/ path.
 */
function mapNextServerPathToSource(fileName: string): string {
  // E.g.  /workspace/.next/server/app/(chat)/api/files/upload/route.ts
  // =>    /workspace/app/(chat)/api/files/upload/route.ts
  return fileName.replace(/\.next\/server\//, '');
}

/**
 * If in Node, read lines from local .ts file near the given line.
 */
function getCodeSnippet(filePath: string, line: number, contextLines = 3): string {
  if (!isNodeRuntime || !fs) {
    return 'Skipping snippet in Edge / non-Node environment.';
  }
  try {
    const all = fs.readFileSync(filePath, 'utf8').split('\n');
    const start = Math.max(0, line - contextLines - 1);
    const end = Math.min(all.length, line + contextLines);
    return all.slice(start, end).join('\n');
  } catch {
    return 'Unable to read snippet.';
  }
}

/**
 * A higher-order function (HOF) that wraps a Next.js (App Router) route,
 * capturing advanced tracing and logs. If in Node runtime, we attempt
 * to parse stack frames, read source code snippets, etc. 
 */
export function withTraceAndLogging(
  handler: (req: Request) => Promise<Response> | Response
) {
  const tracer = trace.getTracer('api-routes');

  return async function wrappedHandler(originalRequest: Request): Promise<Response> {
    const activeCtx = context.active();

    return tracer.startActiveSpan('Route', {}, activeCtx, async (span: Span) => {
      let response: Response;

      try {
        // 1) If in Node, parse stack trace from new Error
        if (isNodeRuntime && stackTrace) {
          try {
            const frames = stackTrace.parse(new Error());
            // Skip frames from node_modules
            const userFrame = frames.find(
              (f: any) => f.getFileName() && !f.getFileName().includes('node_modules')
            );
            if (userFrame) {
              const fileName = userFrame.getFileName() || 'unknown.js';
              const line = userFrame.getLineNumber() || 0;
              const column = userFrame.getColumnNumber() || 0;

              // Attempt to map .map for original line/col
              const originalPos = await mapOriginalPosition(fileName, line, column);
              const mappedPath = mapNextServerPathToSource(originalPos.source);

              if (path) {
                const absolutePath = path.resolve(process.cwd(), mappedPath);
                const snippet = getCodeSnippet(absolutePath, originalPos.line, 3);

                span.setAttribute('file.name', mappedPath);
                span.setAttribute('line.number', originalPos.line);
                span.setAttribute('function.name', originalPos.name || '');
                span.addEvent('surrounding.code', { snippet });
              }
            }
          } catch (err) {
            // skip if we can't parse
            span.addEvent('stackTrace.error', { error: String(err) });
          }
        }

        // 2) Basic request info
        span.setAttribute('http.url', originalRequest.url);
        span.setAttribute('http.method', originalRequest.method);

        // 3) read request body for logging, then re-create a new request
        let requestBody = '';
        try {
          requestBody = await originalRequest.text();
          span.addEvent('request.body', { body: requestBody });
        } catch (err) {
          span.addEvent('request.body.error', { error: String(err) });
        }

        const newRequest = new Request(originalRequest.url, {
          method: originalRequest.method,
          headers: originalRequest.headers,
          body:
            requestBody && !['GET', 'HEAD'].includes(originalRequest.method)
              ? requestBody
              : undefined,
        });

        // 4) call route
        response = await handler(newRequest);

        // 5) clone the response for logging
        try {
          const cloned = response.clone();
          const respText = await cloned.text();
          span.addEvent('response.body', { body: respText });
        } catch (err) {
          span.addEvent('response.body.error', { error: String(err) });
        }

        // log status
        span.addEvent('response.status', { status: response.status });
        span.setAttribute('http.status_code', response.status);

        span.setStatus({ code: SpanStatusCode.OK });
        return response;
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });
        return NextResponse.json({ error: String(error) }, { status: 500 });
      } finally {
        span.end();
        after(() => {
          console.log('[withTraceAndLogging] AFTER: request completed.');
        });
      }
    });
  };
}