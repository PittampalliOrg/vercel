'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import OAuthCallback from '../../components/OAuthCallback';

export default function OAuthCallbackPage() {
  useEffect(() => {
    // The OAuth flow logic is handled in the OAuthCallback component
  }, []);

  return <OAuthCallback />;
}