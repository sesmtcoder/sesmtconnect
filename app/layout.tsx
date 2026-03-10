import type { Metadata } from 'next';
import './globals.css'; // Global styles
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Gerenciador de Segurança EPI',
  description: 'Sistema de Gestão de Equipamentos de Proteção Individual',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plusJakarta.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning className="font-sans">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
