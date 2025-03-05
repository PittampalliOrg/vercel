// lib/withTraceAndLoggingNextAuth.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { after } from 'next/server';
import type { ServerResponse } from 'http';

let stackTrace: any;
let fs: any;
let path: any;

try {
  stackTrace = require('stack-trace');
  fs = require('fs');
  path = require('path');
} catch {
  // fallback
}

async function mapOriginalPosition(fileName: string, line: number, column: number) {
  return {
    source: fileName.replace('.js', '.ts'),
    line: line - 2,
    column,
    name: 'dummyFunction',
  };
}

function getCodeSnippet(filePath: string, line: number, contextLines = 3): string {
  if (!fs) return 'Skipping snippet (Edge environment).';
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
 * HOF for NextAuth or Node-style
 */
export function withTraceAndLoggingNextAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any> | any
) {
  const tracer = trace.getTracer('auth-middleware');

  return async function wrappedNextAuth(req: NextApiRequest, res: NextApiResponse) {
    const activeCtx = context.active();

    return tracer.startActiveSpan('NextAuth', {}, activeCtx, async (span: Span) => {
      const responseChunks: Buffer[] = [];
      const originalWrite = res.write;
      const originalEnd = res.end;

      try {
        // If stack-trace is unavailable, skip
        if (stackTrace && path) {
          try {
            const frames = stackTrace.parse(new Error());
            const userFrame = frames.find(
              (f: any) => f.getFileName() && !f.getFileName().includes('node_modules')
            );
            if (userFrame) {
              const fileName = userFrame.getFileName() || 'unknown.js';
              const line = userFrame.getLineNumber() || 0;
              const column = userFrame.getColumnNumber() || 0;

              const originalPos = await mapOriginalPosition(fileName, line, column);
              const absolutePath = path.resolve(process.cwd(), originalPos.source);
              const snippet = getCodeSnippet(absolutePath, originalPos.line, 3);

              span.setAttribute('file.name', originalPos.source);
              span.setAttribute('line.number', originalPos.line);
              span.setAttribute('function.name', originalPos.name || '');
              span.addEvent('surrounding.code', { snippet });
            }
          } catch (err) {
            span.addEvent('stackTrace.error', { error: String(err) });
          }
        }

        // Basic request info
        span.setAttribute('http.method', req.method ?? '');
        span.setAttribute('http.url', req.url ?? '');
        span.addEvent('request.headers', {
          headers: JSON.stringify(req.headers),
        });

        if (req.body) {
          span.addEvent('request.body', { body: JSON.stringify(req.body) });
        }

        // Patch res.write
        res.write = function (
          chunk: any,
          encodingOrCb?: BufferEncoding | ((error?: Error | null) => void),
          maybeCallback?: (error?: Error | null) => void
        ): boolean {
          let encoding: BufferEncoding = 'utf8';
          let callback: ((error?: Error | null) => void) | undefined;

          if (typeof encodingOrCb === 'function') {
            callback = encodingOrCb;
          } else if (encodingOrCb) {
            encoding = encodingOrCb;
            callback = maybeCallback;
          }

          if (chunk) {
            const buf = typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk;
            responseChunks.push(buf);
          }

          return originalWrite.call(res, chunk, encoding, callback);
        } as typeof res.write;

        // Patch res.end
        res.end = function (
          chunk?: any,
          encodingOrCb?: BufferEncoding | (() => void),
          maybeCallback?: () => void
        ): ServerResponse {
          let encoding: BufferEncoding = 'utf8';
          let callback: (() => void) | undefined;

          if (typeof encodingOrCb === 'function') {
            callback = encodingOrCb;
          } else if (encodingOrCb) {
            encoding = encodingOrCb;
            callback = maybeCallback;
          }

          if (chunk) {
            const buf = typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk;
            responseChunks.push(buf);
          }

          const rawBody = Buffer.concat(responseChunks).toString('utf8');
          span.addEvent('response.raw', {
            statusCode: res.statusCode,
            body: rawBody,
          });
          span.setAttribute('http.status_code', res.statusCode);

          const result = originalEnd.call(res, chunk, encoding, callback);

          after(() => {
            console.log('[withTraceAndLoggingNextAuth] AFTER: status =', res.statusCode);
          });

          return result;
        } as typeof res.end;

        const result = await handler(req, res);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });
        throw error;
      } finally {
        span.end();
      }
    });
  };
}
