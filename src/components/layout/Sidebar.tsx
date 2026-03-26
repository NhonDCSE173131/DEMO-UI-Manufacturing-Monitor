'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Zap,
  BarChart3,
  Wrench,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedLanguage, isSidebarCollapsed, toggleSidebar, sidebarWidth, setSidebarWidth } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const isResizing = useRef(false);
  const pathname = usePathname();

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.userSelect = 'none'; // Prevent text selection
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.userSelect = ''; // Re-enable text selection
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing.current) {
        // Use requestAnimationFrame for smoother performance
        requestAnimationFrame(() => {
          const newWidth = mouseMoveEvent.clientX;
          if (newWidth >= 80 && newWidth <= 400) {
            setSidebarWidth(newWidth);
          }
        });
      }
    },
    [setSidebarWidth]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const menuItems = [
    { icon: LayoutDashboard, label: messages.common.dashboard, href: '/' },
    { icon: Cpu, label: messages.common.machines, href: '/machines' },
    { icon: Zap, label: messages.common.energy, href: '/energy' },
    { icon: BarChart3, label: messages.common.oeeAnalytics, href: '/oee' },
    { icon: Wrench, label: messages.common.toolLife, href: '/tools' },
    { icon: Activity, label: messages.common.maintenance, href: '/maintenance' },
    { icon: ShieldAlert, label: messages.common.alarmsDowntime, href: '/alarms' },
    { icon: Settings, label: messages.common.settings, href: '/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

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
        style={{ width: isSidebarCollapsed ? 80 : sidebarWidth }}
        className={`fixed left-0 top-0 h-screen bg-industrial-darker border-r border-industrial-border/20 transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isResizing.current ? '' : 'transition-all duration-300'} z-40 flex flex-col`}
      >
        <div className="p-6 border-b border-industrial-border/20 flex justify-between items-center overflow-hidden">
          {!isSidebarCollapsed && (
            <div>
              <h1 className="text-2xl font-bold whitespace-nowrap flex items-center gap-2">
                <span className="w-7 h-7 rounded-md border border-industrial-border/50 bg-industrial-border/15 text-industrial-border flex items-center justify-center text-sm font-extrabold">RM</span>
                <span className="text-industrial-border tracking-wide">RMSys</span>
              </h1>
              <p className="text-sm text-industrial-text-secondary mt-1 whitespace-nowrap">
                {messages.common.appTagline}
              </p>
            </div>
          )}
          {isSidebarCollapsed && (
            <h1 className="text-base font-bold text-industrial-border mx-auto tracking-widest">RM</h1>
          )}
        </div>

        <nav className="mt-6 space-y-1 px-3 flex-1 overflow-hidden">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group overflow-hidden ${
                  active
                    ? 'bg-industrial-border/20 text-industrial-border border border-industrial-border/50 shadow-md shadow-industrial-border/20 ring-1 ring-industrial-border/30'
                    : 'text-industrial-text-secondary hover:text-industrial-text hover:bg-industrial-card/50 border border-transparent'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {active && <span className="w-1.5 h-6 rounded-full bg-industrial-border"></span>}
                <item.icon size={20} className={`min-w-[20px] transition-colors ${active ? 'text-industrial-border' : 'group-hover:text-industrial-border'}`} />
                {!isSidebarCollapsed && (
                  <span className={`text-sm font-medium whitespace-nowrap ${active ? 'text-industrial-border font-semibold' : ''}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {!isSidebarCollapsed && (
          <div className="p-4 mx-4 mb-6 bg-industrial-card/50 rounded-lg border border-industrial-border/20">
            <p className="text-xs text-industrial-text-secondary mb-2 whitespace-nowrap">
              {messages.common.systemStatus}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-industrial-success animate-pulse"></div>
              <span className="text-sm text-industrial-success whitespace-nowrap">
                {messages.common.online}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 transform -translate-y-1/2 p-1 bg-industrial-card border border-industrial-border/50 rounded-full z-50 text-industrial-text-secondary hover:text-industrial-text hover:bg-industrial-card transition-colors hidden md:block"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {!isSidebarCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-industrial-border/50 transition-colors z-50 hidden md:block"
            onMouseDown={startResizing}
          />
        )}
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

