'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import AuthGuard from '@/components/auth/AuthGuard';
import AppShell from '@/components/layout/AppShell';
import SignInLayout from '@/components/layout/SignInLayout';
import ThemeRegistry from '@/components/providers/ThemeRegistry';
import { SnackbarProvider } from '@/components/providers/SnackbarProvider';
import { ImpersonationProvider } from '@/lib/contexts/ImpersonationContext';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const [isNotFoundPage, setIsNotFoundPage] = useState(false);

  // Vérifier si on est sur une page 404
  useEffect(() => {
    const checkNotFound = () => {
      const isNotFound = document.body.getAttribute('data-page-type') === 'not-found';
      setIsNotFoundPage(isNotFound);
    };

    // Vérifier immédiatement
    checkNotFound();

    // Observer les changements sur le body
    const observer = new MutationObserver(() => {
      checkNotFound();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-page-type'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Si c'est la page 404, rendre directement sans layout
  if (isNotFoundPage) {
    return <>{children}</>;
  }

  // Pages qui utilisent un layout sans navbar/sidebar
  const fullPageLayouts = ['/signin', '/maintenance', '/newpass', '/pdf-open'];

  // Si on est sur une page avec layout complet (signin)
  if (fullPageLayouts.includes(pathname)) {
    return (
      <ThemeRegistry>
        <SnackbarProvider>
          <SessionProvider>
            <ImpersonationProvider>
              <SignInLayout>{children}</SignInLayout>
            </ImpersonationProvider>
          </SessionProvider>
        </SnackbarProvider>
      </ThemeRegistry>
    );
  }

  // Sinon, utiliser le layout avec authentification
  return (
    <ThemeRegistry>
      <SnackbarProvider>
        <SessionProvider>
          <ImpersonationProvider>
            <AuthGuard>
              <AppShell>{children}</AppShell>
            </AuthGuard>
          </ImpersonationProvider>
        </SessionProvider>
      </SnackbarProvider>
    </ThemeRegistry>
  );
}
