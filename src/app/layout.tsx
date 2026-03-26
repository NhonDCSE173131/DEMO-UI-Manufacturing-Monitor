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
          content="Industrial command center for manufacturing monitoring and analytics"
        />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <title>RMSys Manufacturing Command</title>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
