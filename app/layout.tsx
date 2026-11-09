import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Elfie Downloader — Liquid Glass Studio',
  description: 'Download Video, Slide Video Synthesizer, Audio & Media with Liquid Glass UX',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms" data-theme="dark">
      <body>
        <div className="mesh-background" />
        {children}
      </body>
    </html>
  );
}
