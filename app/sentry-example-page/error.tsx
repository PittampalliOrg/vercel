'use client' // Error boundaries must be Client Components
 
import { useEffect } from 'react'
import { captureErrorDetails } from '@/lib/stack/captureErrorDetails';
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    const capturedDetails = captureErrorDetails(error);
    console.log(capturedDetails);
    console.log(error)
  }, [error])
 
  return (
    <div>
      <h2>THis is using the next js default</h2>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </button>
    </div>
  )
}