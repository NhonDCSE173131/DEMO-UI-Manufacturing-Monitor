'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Zap,
  BarChart3,
  Wrench,
  AlertTriangle,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const menuItems = [
    { icon: LayoutDashboard, label: messages.common.dashboard, href: '/' },
    { icon: Zap, label: messages.common.machines, href: '/machines' },
    { icon: BarChart3, label: messages.common.energy, href: '/energy' },
    { icon: BarChart3, label: messages.common.oeeAnalytics, href: '/oee' },
    { icon: Wrench, label: messages.common.toolLife, href: '/tools' },
    { icon: AlertTriangle, label: messages.common.maintenance, href: '/maintenance' },
    { icon: AlertTriangle, label: messages.common.alarmsDowntime, href: '/alarms' },
    { icon: Settings, label: messages.common.settings, href: '/settings' },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 md:hidden z-50 p-2 rounded-lg bg-industrial-card border border-industrial-border/30"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-industrial-darker border-r border-industrial-border/20 transform transition-transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } z-40`}
      >
        <div className="p-6 border-b border-industrial-border/20">
          <h1 className="text-2xl font-bold text-industrial-border">
            <span className="text-industrial-border-light">⚙️</span> RMSys
          </h1>
          <p className="text-sm text-industrial-text-secondary mt-1">
            Manufacturing Monitor
          </p>
        </div>

        <nav className="mt-8 space-y-2 px-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-industrial-text-secondary hover:text-industrial-text hover:bg-industrial-card/50 transition-all group"
            >
              <item.icon size={20} className="group-hover:text-industrial-border transition-colors" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-4 right-4 p-4 bg-industrial-card/50 rounded-lg border border-industrial-border/20">
          <p className="text-xs text-industrial-text-secondary mb-2">
            System Status
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-industrial-success animate-pulse"></div>
            <span className="text-sm text-industrial-success">Online</span>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 md:hidden z-30"
        />
      )}
    </>
  );
};

export default Sidebar;

