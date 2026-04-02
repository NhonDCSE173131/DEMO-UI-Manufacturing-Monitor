'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Settings, BarChart3 } from 'lucide-react';

interface MachinesLayoutProps {
  children: React.ReactNode;
}

export default function MachinesLayout({ children }: MachinesLayoutProps) {
  return <>{children}</>;
}

