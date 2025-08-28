import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Réactifs',
};

export default function ReactifsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
