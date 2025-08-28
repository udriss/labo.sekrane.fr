import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Salles',
};

export default function SallesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
