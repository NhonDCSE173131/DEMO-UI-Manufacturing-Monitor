'use client';

import { appEnv } from '@/lib/config/env';
import { useMachineStore } from '@/lib/store';

/**
 * MockModeBanner – hiển thị banner nhắc nhở khi ứng dụng đang chạy ở chế độ Mock.
 * Chỉ render khi NEXT_PUBLIC_USE_MOCK=true.
 */
export function MockModeBanner() {
  const { selectedLanguage } = useMachineStore();

  if (!appEnv.useMock) return null;

  return (
    <div className="w-full bg-yellow-500/15 border-b border-yellow-500/40 px-4 py-1.5 flex items-center justify-center gap-2 text-yellow-400 text-xs font-semibold z-50">
      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
      {selectedLanguage === 'vi'
        ? '⚠ Chế độ Mock đang bật — dữ liệu hiển thị là giả lập, không phải từ backend thật.'
        : '⚠ Mock Mode Active — data shown is simulated, not from a real backend.'}
    </div>
  );
}

