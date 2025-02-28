'use client'

import { useEffect } from 'react'

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load the client-side instrumentation
    const initTelemetry = async () => {
      const instrumentation = await import('../instrumentation.browser')
      instrumentation.register()
    }
    
    initTelemetry().catch(console.error)
  }, [])

  return <>{children}</>
}