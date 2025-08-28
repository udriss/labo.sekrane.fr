import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prévisualisation PDF',
};

export default function PDFPreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
