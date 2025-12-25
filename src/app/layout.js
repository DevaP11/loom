import "./globals.css";
// app/layout.tsx (App Router)

import { Poiret_One } from 'next/font/google';

const poiret = Poiret_One({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poiret.className}>
      <body>{children}</body>
    </html>
  );
}
