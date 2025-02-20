// 'app.ts' - Example page that throws an error
import { defaultStackParser } from '@/lib/stack/stack-parsers';
import { UNKNOWN_FUNCTION } from '@/lib/stack/utils-hoist';

// Function to trigger an error
function throwError() {
  throw new Error('Something went wrong!');
}

// Function to capture and extract stack trace details using the provided stack parser
function captureErrorDetails(error: Error) {
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

// Event listener that triggers on error
window.onerror = (message, source, lineno, colno, error) => {
  const errorDetails = captureErrorDetails(error);
  document.getElementById('error-container')!.textContent = JSON.stringify(errorDetails, null, 2); // Display the captured error context on the page
  console.error('Captured Error Details:', errorDetails);
};

// Button click triggers the error
document.getElementById('trigger-error')?.addEventListener('click', () => {
  throwError();
});
