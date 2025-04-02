// src/components/ui/json-view.tsx
// Basic JSON viewer - consider a library like react-json-view for more features
import React from 'react';

interface JsonViewProps {
  data: any;
  initialExpandDepth?: number; // Add depth control if needed later
}

export const JsonView: React.FC<JsonViewProps> = ({ data }) => {
  let jsonData = data;
  if (typeof data === 'string') {
    try {
      jsonData = JSON.parse(data);
    } catch {
      // If it's not JSON, display as plain text
      return <pre className="text-xs p-2 bg-muted rounded overflow-auto whitespace-pre-wrap">{data}</pre>;
    }
  }

  return (
    <pre className="text-xs p-2 bg-muted rounded overflow-auto">
      {JSON.stringify(jsonData, null, 2)}
    </pre>
  );
};