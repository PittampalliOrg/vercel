// 'lib/captureErrorDetails.ts'
import { defaultStackParser } from './stack-parsers';
import { UNKNOWN_FUNCTION } from './utils-hoist';

export function captureErrorDetails(error: Error) {
  const stack = error.stack || '';
  const frames = defaultStackParser(stack);  // Using the stack parser from provided code

  const capturedFrames = frames.map(frame => {
    const { function: func, filename, lineno, colno } = frame;
    return {
      function: func || UNKNOWN_FUNCTION,
      filename,
      lineno,
      colno,
    };
  });

  console.log('Captured Stack Trace:', capturedFrames);
  return capturedFrames;
}
