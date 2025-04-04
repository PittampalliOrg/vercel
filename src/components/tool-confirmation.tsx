
'use client';

import { ToolCallPart } from 'ai';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { CodeBlock } from './code-block';

interface ToolConfirmationProps {
  toolCall: ToolCallPart;
  onConfirm: () => void;
  onDeny: () => void;
}

// Safely format unknown args, ensuring a string return
const formatJsonSafe = (obj: unknown): string => {
    if (obj === undefined || obj === null) return "{}";
    try {
        // Stringify even non-objects for consistent display in code block
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        console.warn("Could not stringify tool arguments:", obj, e);
        return String(obj); // Fallback to simple string conversion
    }
};

export function ToolConfirmation({ toolCall, onConfirm, onDeny }: ToolConfirmationProps) {
  // Assign formatted string to a variable
  const formattedArgs: string = formatJsonSafe(toolCall.args);

  return (
    <div className="ml-12 my-2 p-3 border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 rounded-md shadow-sm">
      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
        Allow assistant to run tool: <span className="font-semibold">{toolCall.toolName}</span>?
      </p>
       {/* Display arguments */}
       {toolCall.args && (typeof toolCall.args !== 'object' || Object.keys(toolCall.args as Record<string, unknown>).length > 0) && (
            <div className="mb-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">With arguments:</div>
                {/* Pass the explicitly typed string variable */}
                <CodeBlock className="text-xs max-h-32 overflow-auto">
                   {formattedArgs}
                </CodeBlock>
            </div>
       )}
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={onConfirm} className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300 dark:bg-green-800/30 dark:text-green-200 dark:border-green-700 dark:hover:bg-green-700/40">
          <Check className="h-4 w-4 mr-1" /> Yes, proceed
        </Button>
        <Button size="sm" variant="outline" onClick={onDeny} className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300 dark:bg-red-800/30 dark:text-red-200 dark:border-red-700 dark:hover:bg-red-700/40">
          <X className="h-4 w-4 mr-1" /> No, deny
        </Button>
      </div>
    </div>
  );
}