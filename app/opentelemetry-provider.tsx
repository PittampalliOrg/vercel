// app/opentelemetry-provider.tsx
'use client';

import { ReactNode, useEffect } from 'react';

export default function OpentelemetryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Dynamically load the instrumentation code in the browser
    import('../instrumentation.client')
      .then(() => {
        console.log('Web instrumentation loaded in the browser');
      })
      .catch((err) => {
        console.error('Failed to load instrumentation:', err);
      });
  }, []);

  return <>{children}</>;
}
