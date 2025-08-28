import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calendrier',
};

export default function CalendrierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
