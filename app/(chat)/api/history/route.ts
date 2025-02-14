import { auth } from '@/app/(auth)/auth';
import { getChatsByUserId } from '@/lib/db/queries';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export async function GET() {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('GET /api/history', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/history/route.ts:7');
      span.addEvent('Handling GET /api/history');

      const session = await auth();
      if (!session || !session.user) {
        return new Response('Unauthorized!', { status: 401 });
      }

      const chats = await getChatsByUserId({ id: session.user.id });
      return new Response(JSON.stringify(chats));
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return new Response('Error fetching chat history', { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;

      span.end();
    }
  });
}
