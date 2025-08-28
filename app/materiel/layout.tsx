import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Matériel',
};

export default function MaterielLayout({ children }: { children: React.ReactNode }) {
  return children;
}
