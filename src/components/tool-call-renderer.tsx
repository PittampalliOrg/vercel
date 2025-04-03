"use client";

import { useState } from "react";
import { CodeBlock } from "./code-block"; // Use your actual CodeBlock component
import type { ToolCall, ToolInvocation as SdkToolInvocation, ToolResult } from 'ai'; // Import SDK types

// Define the props for CodeBlock based on its implementation
interface CodeBlockProps {
  children: React.ReactNode; // Expects content as children
  className?: string;
  // Add other props your CodeBlock accepts, e.g., 'inline'
  inline?: boolean;
}

// Use the SDK's ToolInvocation type
type ToolInvocation = SdkToolInvocation;

interface ToolCallRendererProps {
  invocation: ToolInvocation;
}

export const ToolCallRenderer: React.FC<ToolCallRendererProps> = ({
  invocation,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Determine status, args, and result based on invocation.state
  let status: 'running' | 'success' | 'error' = 'running';
  let result: any = undefined;
  // Args can be present in 'call' and 'result' states
  const args: any = (invocation as ToolCall<string, any> | ToolResult<string, any, any>).args;

  if (invocation.state === 'call' || invocation.state === 'partial-call') {
    status = 'running';
  } else if (invocation.state === 'result') {
    result = (invocation as ToolResult<string, any, any>).result;
    // Basic check if result indicates an error
    if (typeof result?.error === 'string' || (typeof result === 'string' && result.toLowerCase().includes('error'))) {
      status = 'error';
    } else {
      status = 'success';
    }
  } else {
    console.warn("Unexpected tool invocation state:", invocation);
    status = 'error'; // Fallback for unknown states
  }

  // Status color mapping
  const statusColors: Record<string, string> = {
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  const statusColor = statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

  const formatJsonSafe = (obj: any): string => {
    if (obj === undefined || obj === null) return "";
    try {
      if (typeof obj === 'object') {
         return JSON.stringify(obj, null, 2);
      }
      return String(obj);
    } catch (e) {
      return String(obj); // Fallback
    }
  };

  return (
    <div className="my-2 rounded-lg border border-border overflow-hidden shadow-sm bg-muted/30">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleExpand()}
        aria-expanded={isExpanded}
        aria-controls={`tool-details-${invocation.toolCallId}`}
      >
        <div className="flex items-center space-x-2">
          <span className="font-medium text-foreground text-sm">{invocation.toolName}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
            {status}
          </span>
        </div>
        <button
          className="text-muted-foreground hover:text-foreground focus:outline-none transition-transform transform"
          aria-label={isExpanded ? "Collapse Tool Details" : "Expand Tool Details"}
        >
          <svg
            className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Details */}
      {isExpanded && (
        <div id={`tool-details-${invocation.toolCallId}`} className="p-3 border-t border-border bg-background">
          {/* Arguments Section */}
          {args != null && (
             <div className="mb-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">Arguments:</div>
                 {/* Pass content as children to CodeBlock */}
                <CodeBlock>
                  {formatJsonSafe(args)}
                </CodeBlock>
             </div>
          )}

          {/* Result Section */}
          {result != null && (
             <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Result:</div>
                 {/* Pass content as children to CodeBlock */}
                 <CodeBlock>
                   {formatJsonSafe(result)}
                 </CodeBlock>
             </div>
          )}
           {result == null && status === 'success' && (
              <div className="text-xs text-muted-foreground italic">Tool executed successfully (no explicit result).</div>
           )}
           {/* Error display */}
            {status === 'error' && result?.error && (
                 <div>
                    <div className="text-xs font-medium text-red-500 mb-1">Error:</div>
                     {/* Pass content as children to CodeBlock */}
                     <CodeBlock>
                       {formatJsonSafe(result.error)}
                     </CodeBlock>
                 </div>
            )}
             {status === 'error' && !result?.error && ( // Handle generic errors shown in result
                  <div>
                     <div className="text-xs font-medium text-red-500 mb-1">Error Result:</div>
                      <CodeBlock>
                        {formatJsonSafe(result)}
                      </CodeBlock>
                  </div>
             )}
        </div>
      )}
    </div>
  );
};