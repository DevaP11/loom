import "./globals.css";
// app/layout.tsx (App Router)

import { Geist } from 'next/font/google';

const font = Geist({
  subsets: ['latin', 'cyrillic'],
  weight: '100',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={font.className}>
      <body>{children}</body>
    </html>
  );
}
