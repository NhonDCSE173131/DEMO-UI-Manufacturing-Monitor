'use client';

import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

export type TimeRange = '60s' | '1h' | '1d' | '1w' | '1m';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  showLabel?: boolean;
}

export function TimeRangeSelector({ value, onChange, showLabel = true }: TimeRangeSelectorProps) {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '60s', label: messages.machineDetail.timeRange60s },
    { value: '1h', label: messages.machineDetail.timeRange1h },
    { value: '1d', label: messages.machineDetail.timeRange1d },
    { value: '1w', label: messages.machineDetail.timeRange1w },
    { value: '1m', label: messages.machineDetail.timeRange1m },
  ];

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs text-industrial-text-secondary uppercase">
          {(messages.machineDetail as any).timeRangeLabel || (selectedLanguage === 'en' ? 'Time Range' : 'Khoảng thời gian')}:
        </span>
      )}
      <div className="flex gap-1 bg-industrial-card/40 rounded-lg p-1 border border-industrial-border/20">
        {timeRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => onChange(range.value)}
            className={`px-2.5 py-1 rounded text-xs transition-all ${
              value === range.value
                ? 'bg-industrial-border/20 text-industrial-border font-semibold'
                : 'text-industrial-text-secondary hover:text-industrial-text'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}

