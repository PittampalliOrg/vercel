import { auth } from '@/app/(auth)/auth';
import { getSuggestionsByDocumentId } from '@/lib/db/queries';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export async function GET(request: Request) {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('GET /api/suggestions', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/suggestions/route.ts:7');
      span.addEvent('Handling GET /api/suggestions');

      const { searchParams } = new URL(request.url);
      const documentId = searchParams.get('documentId');

      if (!documentId) {
        return new Response('Not Found', { status: 404 });
      }

      const session = await auth();
      if (!session || !session.user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const suggestions = await getSuggestionsByDocumentId({ documentId });
      const [oneSuggestion] = suggestions;

      if (!oneSuggestion) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      if (oneSuggestion.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }

      return new Response(JSON.stringify(suggestions), { status: 200 });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return new Response('Suggestions GET error', { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;
      span.end();
    }
  });
}
