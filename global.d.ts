// global.d.ts

declare module 'stack-trace' {
    export interface StackFrame {
      getFileName(): string | undefined;
      getLineNumber(): number | undefined;
      getColumnNumber(): number | undefined;
      getFunctionName(): string | undefined;
      // ...any other methods from stack-trace if needed
    }
  
    export function parse(err: Error): StackFrame[];
  }
  