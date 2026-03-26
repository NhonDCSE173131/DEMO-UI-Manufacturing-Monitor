'use client';

import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

const appTitle = 'RMSys Trung tam dieu hanh san xuat';
const appDescription = 'Trung tam dieu hanh san xuat cho giam sat may moc, nang luong va phan tich OEE';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content={appDescription}
        />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <title>{appTitle}</title>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
