'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { SessionProvider } from 'next-auth/react';
import { DriveSyncProvider } from './DriveSyncProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "694470175486-dsbrga5g3h3dq009qemd4jtenm72dr3r.apps.googleusercontent.com"}>
        <DriveSyncProvider>
          {children}
        </DriveSyncProvider>
      </GoogleOAuthProvider>
    </SessionProvider>
  );
}
