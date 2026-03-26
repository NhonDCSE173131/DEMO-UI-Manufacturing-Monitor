'use client';

import { useMachineStore } from '@/lib/store';
import { Settings as SettingsIcon, SlidersHorizontal, Clock3, BellRing } from 'lucide-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import { useMachinesData } from '@/hooks/useMachinesData';
import { useSettingsThresholds } from '@/hooks/useSettingsThresholds';
import { appEnv } from '@/lib/config/env';
import { formatAreaLabel } from '@/lib/machine-presentation';

const SettingsPage = () => {
  const {
    selectedLanguage,
    setLanguage,
    selectedShift,
    setShift,
    selectedStatusFilter,
    setStatusFilter,
    selectedAreaFilter,
    setAreaFilter,
    userRole,
    setUserRole,
  } = useMachineStore();
  const { machines, loading: machinesLoading, error: machinesError, usingMock: machinesUsingMock } = useMachinesData();
  const { thresholds, loading: thresholdsLoading, error: thresholdsError, usingMock: thresholdsUsingMock } = useSettingsThresholds();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const areaOptions = ['all', ...new Set(machines.map((machine) => machine.area))];

  return (
    <div className="space-y-6 animate-fade-in">
      {(!(machinesUsingMock && thresholdsUsingMock) && (machinesLoading || thresholdsLoading || machinesError || thresholdsError)) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {machinesLoading || thresholdsLoading
            ? selectedLanguage === 'en'
              ? 'Loading system settings from backend...'
              : 'Dang tai cai dat he thong tu backend...'
            : selectedLanguage === 'en'
            ? `Backend unavailable. Showing local fallback. ${machinesError || thresholdsError || ''}`
            : `Backend tam thoi khong phan hoi. Dang hien thi du lieu du phong. ${machinesError || thresholdsError || ''}`}
        </div>
      )}

      <div className="card-industrial p-6">
        <h3 className="panel-title mb-5">
          <SettingsIcon size={18} />
          {selectedLanguage === 'en' ? 'System Preferences' : 'Tùy chọn hệ thống'}
        </h3>
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
            <h3 className="text-industrial-text font-semibold mb-4 flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-industrial-border" />
              {selectedLanguage === 'en' ? 'Default Command Bar Filters' : 'Bộ lọc command bar mặc định'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-industrial-text-secondary mb-2 uppercase tracking-wide">{selectedLanguage === 'en' ? 'Shift' : 'Ca'}</p>
                <select value={selectedShift} onChange={(e) => setShift(e.target.value as 'all' | 'shift_a' | 'shift_b' | 'shift_c')} className="w-full px-3 py-2 rounded-lg bg-industrial-darker border border-industrial-border/30 text-sm text-industrial-text outline-none">
                  <option value="all">{selectedLanguage === 'en' ? 'All shifts' : 'Tất cả ca'}</option>
                  <option value="shift_a">{selectedLanguage === 'en' ? 'Shift A' : 'Ca A'}</option>
                  <option value="shift_b">{selectedLanguage === 'en' ? 'Shift B' : 'Ca B'}</option>
                  <option value="shift_c">{selectedLanguage === 'en' ? 'Shift C' : 'Ca C'}</option>
                </select>
              </div>
              <div>
                <p className="text-xs text-industrial-text-secondary mb-2 uppercase tracking-wide">{selectedLanguage === 'en' ? 'Area' : 'Khu vực'}</p>
                <select value={selectedAreaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-industrial-darker border border-industrial-border/30 text-sm text-industrial-text outline-none">
                  <option value="all">{selectedLanguage === 'en' ? 'All areas' : 'Tất cả khu vực'}</option>
                  {areaOptions.slice(1).map((area) => (
                    <option key={area} value={area}>{formatAreaLabel(area, selectedLanguage === 'en' ? 'en' : 'vi')}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-industrial-text-secondary mb-2 uppercase tracking-wide">{selectedLanguage === 'en' ? 'Status' : 'Trạng thái'}</p>
                <select value={selectedStatusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'RUN' | 'IDLE' | 'STOP' | 'FAULT' | 'MAINT')} className="w-full px-3 py-2 rounded-lg bg-industrial-darker border border-industrial-border/30 text-sm text-industrial-text outline-none">
                  <option value="all">{selectedLanguage === 'en' ? 'All status' : 'Tất cả trạng thái'}</option>
                  <option value="RUN">{messages.machine.running}</option>
                  <option value="IDLE">{messages.machine.idle}</option>
                  <option value="STOP">{messages.machine.stopped}</option>
                  <option value="FAULT">{messages.machine.fault}</option>
                  <option value="MAINT">{messages.machine.maintenance}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-industrial-border/20 pt-6">
            <h3 className="text-industrial-text font-semibold mb-4 flex items-center gap-2">
              <SettingsIcon size={16} className="text-industrial-border" />
              {selectedLanguage === 'en' ? 'Role Personalization' : 'Cá nhân hóa theo vai trò'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button onClick={() => setUserRole('manager')} className={`px-3 py-2 rounded-lg border text-sm ${userRole === 'manager' ? 'bg-industrial-border/15 border-industrial-border text-industrial-border' : 'bg-industrial-darker border-industrial-border/30 text-industrial-text'}`}>
                {selectedLanguage === 'en' ? 'Manager' : 'Quản lý'}
              </button>
              <button onClick={() => setUserRole('maintenance')} className={`px-3 py-2 rounded-lg border text-sm ${userRole === 'maintenance' ? 'bg-industrial-border/15 border-industrial-border text-industrial-border' : 'bg-industrial-darker border-industrial-border/30 text-industrial-text'}`}>
                {selectedLanguage === 'en' ? 'Maintenance' : 'Bảo trì'}
              </button>
              <button onClick={() => setUserRole('production')} className={`px-3 py-2 rounded-lg border text-sm ${userRole === 'production' ? 'bg-industrial-border/15 border-industrial-border text-industrial-border' : 'bg-industrial-darker border-industrial-border/30 text-industrial-text'}`}>
                {selectedLanguage === 'en' ? 'Production Engineer' : 'Kỹ sư sản xuất'}
              </button>
            </div>
          </div>

          <div className="border-t border-industrial-border/20 pt-6">
            <h3 className="text-industrial-text font-semibold mb-4 flex items-center gap-2">
              <Clock3 size={16} className="text-industrial-border" />
              {selectedLanguage === 'en' ? 'Realtime & Alert Policy' : 'Chính sách thời gian thực và cảnh báo'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-industrial-darker/60 border border-industrial-border/20 rounded-lg p-3">
                <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Sampling' : 'Tần suất lấy mẫu'}</p>
                <p className="text-industrial-text font-medium">{thresholds.samplingSeconds}s</p>
              </div>
              <div className="bg-industrial-darker/60 border border-industrial-border/20 rounded-lg p-3">
                <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Alarm Escalation' : 'Nâng mức cảnh báo'}</p>
                <p className="text-industrial-text font-medium">{selectedLanguage === 'en' ? `Critical after ${thresholds.alarmEscalationMinutes}m unack` : `Nghiem trong sau ${thresholds.alarmEscalationMinutes} phut chua xac nhan`}</p>
              </div>
              <div className="bg-industrial-darker/60 border border-industrial-border/20 rounded-lg p-3">
                <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Maintenance Reminder' : 'Nhắc bảo trì'}</p>
                <p className="text-industrial-text font-medium">{thresholds.maintenanceLeadDays.map((day) => `D-${day}`).join(' / ')}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-industrial-border/20 pt-6">
            <h3 className="text-industrial-text font-semibold mb-4 flex items-center gap-2">
              <SettingsIcon size={16} className="text-industrial-border" />
              {selectedLanguage === 'en' ? 'Backend Thresholds' : 'Ngưỡng từ backend'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-industrial-darker/60 border border-industrial-border/20 rounded-lg p-3">
                <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'High temperature' : 'Ngưỡng nhiệt độ cao'}</p>
                <p className="text-industrial-text font-medium">{thresholds.temperatureHighC}°C</p>
              </div>
              <div className="bg-industrial-darker/60 border border-industrial-border/20 rounded-lg p-3">
                <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'High vibration' : 'Ngưỡng rung cao'}</p>
                <p className="text-industrial-text font-medium">{thresholds.vibrationHighPct}%</p>
              </div>
              <div className="bg-industrial-darker/60 border border-industrial-border/20 rounded-lg p-3">
                <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Rolling retention' : 'Chu ky luu tru'}</p>
                <p className="text-industrial-text font-medium">{thresholds.retentionDays} {selectedLanguage === 'en' ? 'days' : 'ngay'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-industrial-border/20 pt-6">
            <h3 className="text-industrial-text font-semibold mb-4">{selectedLanguage === 'en' ? 'Reporting & Compare Mode' : 'Báo cáo và chế độ so sánh'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-industrial-darker/60 border border-industrial-border/20 rounded-lg p-3">
                <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Compare Window' : 'Cửa sổ so sánh'}</p>
                <p className="text-industrial-text font-medium">{selectedLanguage === 'en' ? 'Shift / Day / Week' : 'Ca / Ngày / Tuần'}</p>
              </div>
              <div className="bg-industrial-darker/60 border border-industrial-border/20 rounded-lg p-3">
                <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Export' : 'Xuất dữ liệu'}</p>
                <p className="text-industrial-text font-medium">{selectedLanguage === 'en' ? 'PDF / CSV / Snapshot' : 'PDF / CSV / Ảnh chụp'}</p>
              </div>
              <div className="bg-industrial-darker/60 border border-industrial-border/20 rounded-lg p-3">
                <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Retention' : 'Lưu trữ'}</p>
                <p className="text-industrial-text font-medium">{selectedLanguage === 'en' ? '30 days rolling data' : 'Dữ liệu cuốn chiếu 30 ngày'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-industrial-border/20 pt-6">
            <h3 className="text-industrial-text font-semibold mb-4">{selectedLanguage === 'en' ? 'System Information' : 'Thông tin hệ thống'}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Application Name' : 'Tên ứng dụng'}</p>
                <p className="text-industrial-text font-medium">{selectedLanguage === 'en' ? 'RMSys Manufacturing Command' : 'RMSys Trung tâm điều hành sản xuất'}</p>
              </div>
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Backend API' : 'API backend'}</p>
                <p className="text-industrial-text font-medium">{appEnv.apiBaseUrl}</p>
              </div>
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Data Mode' : 'Che do du lieu'}</p>
                <p className="text-industrial-text font-medium">{machinesUsingMock || thresholdsUsingMock ? (selectedLanguage === 'en' ? 'Mock fallback' : 'Du phong mock') : (selectedLanguage === 'en' ? 'Backend live' : 'Backend truc tiep')}</p>
              </div>
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Version' : 'Phiên bản'}</p>
                <p className="text-industrial-text font-medium">1.0.0 (Beta)</p>
              </div>
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Status' : 'Trạng thái'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-industrial-success animate-pulse"></div>
                  <p className="text-industrial-success font-medium">{selectedLanguage === 'en' ? 'Online & Monitoring' : 'Trực tuyến và đang giám sát'}</p>
                </div>
              </div>
              <div className="flex justify-between md:justify-start md:gap-12">
                <p className="text-industrial-text-secondary w-32">{selectedLanguage === 'en' ? 'Update Interval' : 'Tốc độ cập nhật'}</p>
                <p className="text-industrial-text font-medium">{selectedLanguage === 'en' ? 'Real-time (Every 2 seconds)' : 'Thời gian thực (Mỗi 2 giây)'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-industrial-border/20 pt-6">
            <h3 className="text-industrial-text font-semibold mb-4 flex items-center gap-2"><BellRing size={16} className="text-industrial-border" />{selectedLanguage === 'en' ? 'About' : 'Giới thiệu'}</h3>
            <p className="text-sm text-industrial-text-secondary leading-relaxed max-w-3xl">
              {selectedLanguage === 'en' 
                ? 'A comprehensive industrial dashboard for real-time monitoring of manufacturing systems, including energy consumption, OEE analytics, machine health, and predictive maintenance features.' 
                : 'Nền tảng giám sát công nghiệp theo thời gian thực cho xưởng sản xuất, bao gồm năng lượng, OEE, sức khỏe máy và bảo trì dự đoán.'}
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

