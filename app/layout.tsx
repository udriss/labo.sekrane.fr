import type { Metadata } from 'next';
import React from 'react';
import ThemeRegistry from '@/components/providers/ThemeRegistry';
import './globals.css';
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import { GlobalErrorBoundary } from '@/components/shared/GlobalErrorBoundary';
import LayoutWrapper from '@/components/layout/LayoutWrapper';

export const metadata: Metadata = {
  title: { default: 'SGIL', template: '%s — SGIL' },
  description: "Système de Gestion d'Information de Laboratoire",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <GlobalErrorBoundary>
          <LayoutWrapper>{children}</LayoutWrapper>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
