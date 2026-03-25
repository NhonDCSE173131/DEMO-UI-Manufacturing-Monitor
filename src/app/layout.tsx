'use client';

import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Industrial Dashboard for Manufacturing Monitoring"
        />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <title>Factory Energy & Robot Monitor</title>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
