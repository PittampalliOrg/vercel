// Aggregates local server-side tools

import { Session } from 'next-auth';
import { DataStreamWriter } from 'ai';
import { createDocument } from './create-document';
import { updateDocument } from './update-document';
import { requestSuggestions } from './request-suggestions';
import { getWeather } from './get-weather';

interface ToolProps {
  session: Session;
  dataStream: DataStreamWriter;
}

// Combine local tools into a single object
export const getLocalTools = ({ session, dataStream }: ToolProps) => ({
  createDocument: createDocument({ session, dataStream }),
  updateDocument: updateDocument({ session, dataStream }),
  requestSuggestions: requestSuggestions({ session, dataStream }),
  getWeather: getWeather,
  // Add other local tools here if needed
});