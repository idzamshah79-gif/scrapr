import React from 'react';

export const metadata = {
  title: 'TikTok Media Scraper',
  description: 'Download Video, Audio MP3, Slide & Live Photos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body style={{ margin: 0, padding: 0, fontFamily: 'sans-serif', background: '#0f172a', color: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}
