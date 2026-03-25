'use client';

import { useState } from 'react';
import { Globe, AlertCircle, Bell, X } from 'lucide-react';
import { useMachineStore } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import Link from 'next/link';

const Header = () => {
  const { selectedLanguage, setLanguage, machines, events } = useMachineStore();
  const [showNotifications, setShowNotifications] = useState(false);
  
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const criticalAlerts = events.filter((e) => e.severity === 'critical').length;
  // Recent 5 events
  const recentEvents = [...events].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

  return (
    <header className="sticky top-0 bg-industrial-darker/90 backdrop-blur-md border-b border-industrial-border/20 px-4 md:px-6 py-4 z-30">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-industrial-text">
            {messages.dashboard.title || 'RMSys'}
          </h2>
          <p className="text-sm text-industrial-text-secondary mt-1">
            {messages.common.realTime}
          </p>
        </div>

        <div className="flex items-center gap-4 relative">
          {/* Alerts Badge */}
          {criticalAlerts > 0 && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-industrial-error/10 border border-industrial-error/30">
              <AlertCircle size={18} className="text-industrial-error animate-pulse" />
              <span className="text-sm font-medium text-industrial-error">
                {criticalAlerts} {criticalAlerts === 1 ? (selectedLanguage === 'vi' ? 'Cảnh báo' : 'Alert') : (selectedLanguage === 'vi' ? 'Cảnh báo' : 'Alerts')}
              </span>
            </div>
          )}

          {/* Notifications Notification */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full hover:bg-industrial-card border border-industrial-border/30 text-industrial-text relative transition-all"
            >
              <Bell size={20} />
              {events.length > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-industrial-error border-2 border-industrial-darker rounded-full"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-industrial-dark border border-industrial-border/30 rounded-lg shadow-xl shadow-black/50 overflow-hidden z-50">
                <div className="flex justify-between items-center p-3 border-b border-industrial-border/20 bg-industrial-card/50">
                  <h3 className="font-semibold text-industrial-text">{selectedLanguage === 'en' ? 'Notifications' : 'Thông báo'}</h3>
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
                            {event.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-industrial-text-secondary">{formatDateTime(event.timestamp)}</span>
                        </div>
                        <p className="text-sm font-medium text-industrial-text line-clamp-1">{event.title}</p>
                        <p className="text-xs text-industrial-text-secondary line-clamp-1">{event.message}</p>
                      </div>
                    </Link>
                  )) : (
                    <div className="p-4 text-center text-sm text-industrial-text-secondary">
                      {selectedLanguage === 'en' ? 'No notifications' : 'Không có thông báo'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex gap-2 bg-industrial-card rounded-lg p-1 border border-industrial-border/20">
            <button
              onClick={() => setLanguage('vi')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all text-sm font-bold ${
                selectedLanguage === 'vi'
                  ? 'bg-industrial-border text-industrial-darker shadow-sm'
                  : 'text-industrial-text-secondary hover:text-industrial-text'
              }`}
            >
              VN
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all text-sm font-bold ${
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
    </header>
  );
};

export default Header;

