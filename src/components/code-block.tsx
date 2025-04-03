'use client';

import { cn } from '@/lib/utils'; // Import the cn utility

// Props definition based on the provided code
interface CodeBlockProps {
  node?: any; // Optional node prop
  inline?: boolean; // Optional inline prop
  className?: string; // Optional className prop
  children: React.ReactNode; // children is required
}

// CodeBlock component implementation
export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props // Capture any other standard HTML attributes
}: CodeBlockProps) {
  if (!inline) {
    return (
      <div className="not-prose flex flex-col">
        <pre
          {...props}
          // Use cn for merging classes
          className={cn(
             "text-sm w-full overflow-x-auto dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900",
             className
           )}
        >
          <code className="whitespace-pre-wrap break-words">{children}</code>
        </pre>
      </div>
    );
  } else {
    return (
      <code
        // Use cn for merging classes
        className={cn(
          "text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md",
           className
          )}
        {...props}
      >
        {children}
      </code>
    );
  }
}