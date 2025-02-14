import { auth } from '@/app/(auth)/auth';
import { BlockKind } from '@/components/block';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from '@/lib/db/queries';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export async function GET(request: Request) {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('GET /api/document', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/document/route.ts:10');
      span.addEvent('Handling GET /api/document');

      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return new Response('Missing id', { status: 400 });
      }

      const session = await auth();
      if (!session || !session.user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const documents = await getDocumentsById({ id });
      const [document] = documents;

      if (!document) {
        return new Response('Not Found', { status: 404 });
      }

      if (document.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }

      return new Response(JSON.stringify(documents), { status: 200 });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return new Response('Document GET error', { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;

      span.end();
    }
  });
}

export async function POST(request: Request) {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('POST /api/document', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/document/route.ts:49');
      span.addEvent('Handling POST /api/document');

      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return new Response('Missing id', { status: 400 });
      }

      const session = await auth();
      if (!session) {
        return new Response('Unauthorized', { status: 401 });
      }

      const { content, title, kind }: {
        content: string;
        title: string;
        kind: BlockKind;
      } = await request.json();

      if (session.user?.id) {
        const document = await saveDocument({
          id,
          content,
          title,
          kind,
          userId: session.user.id,
        });

        return new Response(JSON.stringify(document), { status: 200 });
      }
      return new Response('Unauthorized', { status: 401 });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return new Response('Document POST error', { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;

      span.end();
    }
  });
}

export async function PATCH(request: Request) {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('PATCH /api/document', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/document/route.ts:94');
      span.addEvent('Handling PATCH /api/document');

      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      const { timestamp }: { timestamp: string } = await request.json();

      if (!id) {
        return new Response('Missing id', { status: 400 });
      }

      const session = await auth();
      if (!session || !session.user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const documents = await getDocumentsById({ id });
      const [doc] = documents;

      if (doc.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }

      await deleteDocumentsByIdAfterTimestamp({
        id,
        timestamp: new Date(timestamp),
      });

      return new Response('Deleted', { status: 200 });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return new Response('Document PATCH error', { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;

      span.end();
    }
  });
}
