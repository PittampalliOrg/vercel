// 'app/(chat)/api/document/route.ts'
import { auth } from '@/app/(auth)/auth';
import { BlockKind } from '@/lib/db/queries';
import { dbActions } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documents = await dbActions.getDocumentsById({ id });

  // Check if documents is an array before destructuring
  if (!Array.isArray(documents)) {
    return new Response('Unexpected response format', { status: 500 });
  }

  const [document] = documents;

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: string } = await request.json();

  // Ensure kind is a valid BlockKind
  if (!['text', 'code', 'image'].includes(kind)) {
    return new Response('Invalid kind', { status: 400 });
  }

  // Convert the request "kind" into the BlockKind enum
  const blockKind =
    kind === 'text'
      ? BlockKind.Text
      : kind === 'code'
      ? BlockKind.Code
      : BlockKind.Image;

  if (session.user?.id) {
    const document = await dbActions.saveDocument({
      id,
      content,
      title,
      kind: blockKind,
      userId: session.user.id,
    });

    return Response.json(document, { status: 200 });
  }
  return new Response('Unauthorized', { status: 401 });
}


export async function PATCH(request: Request) {
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

  const documents = await dbActions.getDocumentsById({ id });

  // Check if documents is an array before destructuring
  if (!Array.isArray(documents)) {
    return new Response('Unexpected response format', { status: 500 });
  }

  const [document] = documents;

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  await dbActions.deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return new Response('Deleted', { status: 200 });
}
