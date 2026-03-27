'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Bell, X, Clock, ChevronRight, Filter } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMachineStore } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import Link from 'next/link';
import { getRouteMeta } from '@/lib/route-meta';
import { formatAreaLabel } from '@/lib/machine-presentation';

const getByPath = (obj: any, path: string, fallback: string) => {
  return path.split('.').reduce((acc: any, key) => (acc && key in acc ? acc[key] : undefined), obj) || fallback;
};

const Header = () => {
  const {
    selectedLanguage,
    setLanguage,
    events,
    machines,
    selectedShift,
    setShift,
    selectedAreaFilter,
    setAreaFilter,
    selectedStatusFilter,
    setStatusFilter,
    userRole,
  } = useMachineStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  // Realtime clock (client-only) to avoid hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const criticalAlerts = events.filter((e) => e.severity === 'critical').length;
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const routeInfo = getRouteMeta(pathname) as any;
  const areaOptions: string[] = ['all', ...Array.from(new Set<string>(machines.map((machine) => String(machine.area))))];

  const title = routeInfo.titleKey
    ? getByPath(messages, routeInfo.titleKey, selectedLanguage === 'en' ? 'Dashboard' : 'Bảng điều khiển')
    : selectedLanguage === 'en'
      ? (routeInfo.titleEn || 'Dashboard')
      : (routeInfo.titleVi || 'Bảng điều khiển');
  const subtitle = routeInfo.subtitleKey
    ? getByPath(messages, routeInfo.subtitleKey, selectedLanguage === 'en' ? 'System overview' : 'Tổng quan hệ thống')
    : selectedLanguage === 'en'
      ? (routeInfo.subtitleEn || 'System overview')
      : (routeInfo.subtitleVi || 'Tổng quan hệ thống');
  const rootBreadcrumb = getByPath(messages, 'header.routes.dashboard.breadcrumb', selectedLanguage === 'en' ? 'Dashboard' : 'Bảng điều khiển');
  const currentBreadcrumb = routeInfo.breadcrumbKey
    ? getByPath(messages, routeInfo.breadcrumbKey, rootBreadcrumb)
    : selectedLanguage === 'en'
      ? (routeInfo.breadcrumbEn || rootBreadcrumb)
      : (routeInfo.breadcrumbVi || rootBreadcrumb);
  const breadcrumbItems: string[] = pathname === '/' ? [rootBreadcrumb] : [rootBreadcrumb, currentBreadcrumb];
  const severityLabel: Record<'critical' | 'warning' | 'info', string> = {
    critical: selectedLanguage === 'en' ? 'Critical' : 'Nghiêm trọng',
    warning: selectedLanguage === 'en' ? 'Warning' : 'Cảnh báo',
    info: selectedLanguage === 'en' ? 'Info' : 'Thông tin',
  };

  const formatClock = (date?: Date | null) => {
    if (!date) return { time: '--:--:--', date: '--/--/----' };
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return { time: `${h}:${m}:${s}`, date: `${day}/${month}/${year}` };
  };

  const clock = formatClock(currentTime);
  const roleLabelMap: Record<'manager' | 'maintenance' | 'production', string> = {
    manager: selectedLanguage === 'en' ? 'Manager' : 'Quản lý',
    maintenance: selectedLanguage === 'en' ? 'Maintenance' : 'Bảo trì',
    production: selectedLanguage === 'en' ? 'Production' : 'Sản xuất',
  };

  useEffect(() => {
    if (!showNotifications) return;
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  return (
    <header className="sticky top-0 bg-industrial-darker/90 backdrop-blur-md border-b border-industrial-border/20 px-4 md:px-6 py-3 z-30">
      <div className="space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-industrial-text-secondary mb-1">
              {breadcrumbItems.map((item: string, index: number) => (
                <div className="flex items-center gap-2" key={`${item}-${index}`}>
                  {index > 0 && <ChevronRight size={12} className="opacity-70" />}
                  <span className={index === breadcrumbItems.length - 1 ? 'text-industrial-text' : ''}>{item}</span>
                </div>
              ))}
            </div>
          <h2 className="text-lg md:text-xl font-bold text-industrial-text">
            {title}
          </h2>
          <p className="text-xs text-industrial-text-secondary mt-0.5">
            {subtitle}
          </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative">
          {/* Realtime Clock */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-industrial-card/50 border border-industrial-border/10 text-industrial-text-secondary">
            <Clock size={14} className="text-industrial-border opacity-70" />
            <span suppressHydrationWarning className="text-sm font-mono font-medium text-industrial-text">{clock.time}</span>
            <span suppressHydrationWarning className="text-xs text-industrial-text-secondary">{clock.date}</span>
          </div>

          {/* Alerts Badge */}
          {criticalAlerts > 0 && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-industrial-error/10 border border-industrial-error/30">
              <AlertCircle size={16} className="text-industrial-error animate-pulse" />
              <span className="text-sm font-medium text-industrial-error">
                {criticalAlerts} {selectedLanguage === 'vi' ? 'Cảnh báo' : (criticalAlerts === 1 ? 'Alert' : 'Alerts')}
              </span>
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full hover:bg-industrial-card border border-industrial-border/30 text-industrial-text relative transition-all"
            >
              <Bell size={18} />
              {events.length > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-industrial-error border-2 border-industrial-darker rounded-full"></span>
              )}
            </button>
            
            {showNotifications && (
              <div ref={notificationRef} className="absolute right-0 mt-2 w-80 bg-industrial-dark border border-industrial-border/30 rounded-lg shadow-xl shadow-black/50 overflow-hidden z-50">
                <div className="flex justify-between items-center p-3 border-b border-industrial-border/20 bg-industrial-card/50">
                  <h3 className="font-semibold text-industrial-text">{messages.energy.notification}</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-industrial-text-secondary hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {recentEvents.length > 0 ? recentEvents.map((event) => (
                    <Link href={`/alarms`} key={event.id} onClick={() => setShowNotifications(false)}>
                      <div className="p-3 border-b border-industrial-border/10 hover:bg-industrial-card/50 transition-colors">
                        <div className="flex justify-between mb-1">
                          <span className={`text-xs font-bold ${event.severity === 'critical' ? 'text-industrial-error' : event.severity === 'warning' ? 'text-industrial-warning' : 'text-industrial-info'}`}>
                            {severityLabel[event.severity as 'critical' | 'warning' | 'info'] || event.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-industrial-text-secondary">{formatDateTime(event.timestamp)}</span>
                        </div>
                        <p className="text-sm font-medium text-industrial-text line-clamp-1">
                          {selectedLanguage === 'vi' && event.title_vi ? event.title_vi : event.title}
                        </p>
                        <p className="text-xs text-industrial-text-secondary line-clamp-1">
                          {selectedLanguage === 'vi' && event.message_vi ? event.message_vi : event.message}
                        </p>
                        {event.cause && (
                          <p className="text-xs text-industrial-text-secondary line-clamp-1 mt-1">
                            <strong>{messages.machineDetail.cause}:</strong> {selectedLanguage === 'vi' && event.cause_vi ? event.cause_vi : event.cause}
                          </p>
                        )}
                      </div>
                    </Link>
                  )) : (
                    <div className="p-4 text-center text-sm text-industrial-text-secondary">
                      {messages.energy.noNotification}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex gap-1 bg-industrial-card rounded-lg p-1 border border-industrial-border/20">
            <button
              onClick={() => setLanguage('vi')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded transition-all text-xs font-bold ${
                selectedLanguage === 'vi'
                  ? 'bg-industrial-border text-industrial-darker shadow-sm'
                  : 'text-industrial-text-secondary hover:text-industrial-text'
              }`}
            >
              VN
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded transition-all text-xs font-bold ${
                selectedLanguage === 'en'
                  ? 'bg-industrial-border text-industrial-darker shadow-sm'
                  : 'text-industrial-text-secondary hover:text-industrial-text'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-industrial-border/20 pt-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-industrial-card/50 border border-industrial-border/20 text-industrial-text-secondary text-xs">
            <Filter size={13} className="text-industrial-border" />
            <span>{messages.header.globalFilters}</span>
          </div>

          <select
            value={selectedShift}
            onChange={(e) => setShift(e.target.value as 'all' | 'shift_a' | 'shift_b' | 'shift_c')}
            className="px-3 py-1.5 rounded-lg bg-industrial-card/70 border border-industrial-border/20 text-xs text-industrial-text outline-none"
          >
            <option value="all">{messages.header.allShifts}</option>
            <option value="shift_a">{messages.header.shiftA}</option>
            <option value="shift_b">{messages.header.shiftB}</option>
            <option value="shift_c">{messages.header.shiftC}</option>
          </select>

          <select
            value={selectedAreaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-industrial-card/70 border border-industrial-border/20 text-xs text-industrial-text outline-none"
          >
            <option value="all">{messages.header.allAreas}</option>
            {areaOptions.slice(1).map((area) => (
              <option value={area} key={area}>
                {formatAreaLabel(area, selectedLanguage === 'en' ? 'en' : 'vi')}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'RUN' | 'IDLE' | 'STOP' | 'FAULT' | 'MAINT')}
            className="px-3 py-1.5 rounded-lg bg-industrial-card/70 border border-industrial-border/20 text-xs text-industrial-text outline-none"
          >
            <option value="all">{messages.header.allStatus}</option>
            <option value="RUN">{messages.machine.running}</option>
            <option value="IDLE">{messages.machine.idle}</option>
            <option value="STOP">{messages.machine.stopped}</option>
            <option value="FAULT">{messages.machine.fault}</option>
            <option value="MAINT">{messages.machine.maintenance}</option>
          </select>

          <Link href="/alarms" className="px-3 py-1.5 rounded-lg bg-industrial-error/10 border border-industrial-error/30 text-industrial-error text-xs hover:bg-industrial-error/20 transition-colors">
            {(messages.header as any).openAlarms || (selectedLanguage === 'en' ? 'Open Alarms' : 'Mở cảnh báo')}
          </Link>
          <Link href="/maintenance" className="px-3 py-1.5 rounded-lg bg-industrial-warning/10 border border-industrial-warning/30 text-industrial-warning text-xs hover:bg-industrial-warning/20 transition-colors">
            {(messages.header as any).maintenanceQueue || (selectedLanguage === 'en' ? 'Maintenance Queue' : 'Hàng đợi bảo trì')}
          </Link>
          <span className="px-3 py-1.5 rounded-lg bg-industrial-card/70 border border-industrial-border/20 text-xs text-industrial-text-secondary uppercase">
            {(messages.header as any).role || (selectedLanguage === 'en' ? 'Role' : 'Vai trò')}: {roleLabelMap[userRole]}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
