import { statSync } from 'fs';
import { join } from 'path';
import AppShell from '../components/layout/AppShell.jsx';
import './globals.css';

function lastBuildDate() {
  try {
    return statSync(join(process.cwd(), '.next', 'BUILD_ID')).mtime.toISOString();
  } catch {
    return '';
  }
}

export function generateMetadata() {
  return {
    title: 'Porterra Lite — پنل مشتریان',
    applicationName: 'PorterrA-lite',
    authors: [{ name: 'Arash R.' }],
    icons: {
      icon: [
        { url: '/img/logos/logo-light.png', media: '(prefers-color-scheme: light)' },
        { url: '/img/logos/logo-dark.png', media: '(prefers-color-scheme: dark)' },
      ],
    },
    other: { developer: 'Arash R.', 'last-updated': lastBuildDate() },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
      <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
      <AppShell>{children}</AppShell>
      </body>
      </html>
  );
}