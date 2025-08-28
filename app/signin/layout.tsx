import React from 'react';
import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import SignInLayout from '@/components/layout/SignInLayout';

export default function SignInRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SignInLayout>{children}</SignInLayout>
    </SessionProvider>
  );
}

export const metadata: Metadata = {
  title: 'Connexion',
};
