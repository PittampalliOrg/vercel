'use server';

// import { getSuggestionsByDocumentId } from '@/lib/db/queries';
import { dbActions } from '@/lib/db/queries';

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await dbActions.getSuggestionsByDocumentId({ documentId });
  return suggestions;
}
