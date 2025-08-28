import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Événements',
};

export default function EvenementsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
