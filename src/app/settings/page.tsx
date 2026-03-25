'use client';

import { useMachineStore } from '@/lib/store';
import { Settings as SettingsIcon } from 'lucide-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

const SettingsPage = () => {
  const { selectedLanguage, setLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon size={32} className="text-industrial-border" />
        <h1 className="text-2xl font-bold text-industrial-text">
          {messages.common.settings}
        </h1>
      </div>

      <div className="card-industrial p-6">
        {/* Language Settings */}
        <div className="space-y-6">
          <div>
            <h3 className="text-industrial-text font-semibold mb-4">
              {messages.common.language}
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() => setLanguage('vi')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-lg border-2 transition-all font-medium ${
                  selectedLanguage === 'vi'
                    ? 'bg-industrial-border text-industrial-darker border-industrial-border'
                    : 'bg-industrial-darker text-industrial-text border-industrial-border/30 hover:border-industrial-border/50'
                }`}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-lg border-2 transition-all font-medium ${
                  selectedLanguage === 'en'
                    ? 'bg-industrial-border text-industrial-darker border-industrial-border'
                    : 'bg-industrial-darker text-industrial-text border-industrial-border/30 hover:border-industrial-border/50'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          <div className="border-t border-industrial-border/20 pt-6">
            <h3 className="text-industrial-text font-semibold mb-4">{selectedLanguage === 'en' ? 'System Information' : 'Thông tin hệ thống'}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Application Name' : 'Tên ứng dụng'}</p>
                <p className="text-industrial-text font-medium">Factory Energy & Robot Monitor</p>
              </div>
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Version' : 'Phiên bản'}</p>
                <p className="text-industrial-text font-medium">1.0.0 (Beta)</p>
              </div>
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Status' : 'Trạng thái'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-industrial-success animate-pulse"></div>
                  <p className="text-industrial-success font-medium">{selectedLanguage === 'en' ? 'Online & Monitoring' : 'Trực tuyến & Đang giám sát'}</p>
                </div>
              </div>
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Update Interval' : 'Tốc độ cập nhật'}</p>
                <p className="text-industrial-text font-medium">{selectedLanguage === 'en' ? 'Real-time (Every 2 seconds)' : 'Thời gian thực (Mỗi 2 giây)'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-industrial-border/20 pt-6">
            <h3 className="text-industrial-text font-semibold mb-4">{selectedLanguage === 'en' ? 'About' : 'Giới thiệu'}</h3>
            <p className="text-sm text-industrial-text-secondary leading-relaxed max-w-3xl">
              {selectedLanguage === 'en' 
                ? 'A comprehensive industrial dashboard for real-time monitoring of manufacturing systems, including energy consumption, OEE analytics, machine health, and predictive maintenance features.' 
                : 'Một bảng điều khiển công nghiệp toàn diện để giám sát các hệ thống sản xuất trong thời gian thực, bao gồm tiêu thụ năng lượng, phân tích hiệu suất tổng thể (OEE), tình trạng sức khoẻ máy móc, và tính năng bảo trì dự đoán.'}
            </p>
            <p className="text-xs text-industrial-text-secondary mt-4">
              © 2026 RMSys Manufacturing Solutions. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

