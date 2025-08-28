import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon profil',
};

export default function ProfilLayout({ children }: { children: React.ReactNode }) {
  return children;
}
