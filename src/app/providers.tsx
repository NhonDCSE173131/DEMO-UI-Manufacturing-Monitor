'use client';

import { ReactNode } from 'react';
import { useMachineStore } from '@/lib/store';
import * as locales from '@/locales/en.json';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export function Providers({ children }: { children: ReactNode }) {
  const { selectedLanguage } = useMachineStore();

  return (
    <div className="min-h-screen bg-industrial-bg text-industrial-text">
      <Sidebar />
      <div className="ml-0 md:ml-64">
        <Header />
        <main className="p-4 md:p-6 bg-industrial-bg">
          {children}
        </main>
      </div>
    </div>
  );
}

