import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
};

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
