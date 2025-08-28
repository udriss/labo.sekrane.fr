import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cahier',
};

export default function CahierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
