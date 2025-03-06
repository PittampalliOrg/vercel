// instrumentation-utils.ts
"use client";

import * as React from 'react';

/**
 * Patches `console.error` so that whenever it's called in dev mode,
 * we also log the current React Owner Stack (if available).
 *
 * Note: Requires a React version that supports `captureOwnerStack` in dev/Canary.
 */
export function initGlobalOwnerStackLogging() {
  // If production or older React, we skip
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  if (typeof React.captureOwnerStack !== 'function') {
    console.warn('[OwnerStack] captureOwnerStack not available. Ensure a dev or canary build of React.');
    return;
  }

  const originalError = console.error;
  console.error = function patchedConsoleError(...args: unknown[]) {
    // Call the real console.error
    originalError.apply(console, args);

    // Then attempt to get the Owner Stack
    const ownerStack = React.captureOwnerStack();

    console.log('[OwnerStack] Captured from console.error:\n', ownerStack || '(null)');
  };

  console.log('[OwnerStack] Global console.error patch is enabled in dev mode.');
}
