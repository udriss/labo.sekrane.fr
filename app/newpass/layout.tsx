import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nouveau pass',
};

export default function NouveauPassLayout({ children }: { children: React.ReactNode }) {
  return children;
}
