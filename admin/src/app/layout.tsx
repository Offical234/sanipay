import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'SaniPay Admin Console — Nigerian VTU & Financial Operations',
  description:
    'Administrative back-office management system for SaniPay VTU, wallets, and billing services.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark antialiased`}>
      <body className="min-h-full bg-slate-950 text-slate-100 font-sans flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
