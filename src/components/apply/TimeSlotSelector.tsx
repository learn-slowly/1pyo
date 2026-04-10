'use client';

import type { Station } from '@/lib/types';
import { TIME_SLOT_LABELS } from '@/lib/constants';

interface Props {
  station: Station;
  lotteryMode: boolean;
  selected: string | null;
  onSelect: (slot: string) => void;
}

interface SlotOption {
  key: string;
  label: string;
  count: number;
  max: number;
}

function getSlotOptions(station: Station): SlotOption[] {
  switch (station.type) {
    case 'polling':
      return [
        { key: 'am', label: TIME_SLOT_LABELS.am, count: station.am_count, max: station.am_max },
        { key: 'pm', label: TIME_SLOT_LABELS.pm, count: station.pm_count, max: station.pm_max },
      ];
    case 'early':
      return [
        { key: 'd1_am', label: TIME_SLOT_LABELS.d1_am, count: station.d1_am_count, max: station.slot_max },
        { key: 'd1_pm', label: TIME_SLOT_LABELS.d1_pm, count: station.d1_pm_count, max: station.slot_max },
        { key: 'd2_am', label: TIME_SLOT_LABELS.d2_am, count: station.d2_am_count, max: station.slot_max },
        { key: 'd2_pm', label: TIME_SLOT_LABELS.d2_pm, count: station.d2_pm_count, max: station.slot_max },
      ];
    case 'counting':
      return [
        { key: 'all', label: TIME_SLOT_LABELS.all, count: station.current_count, max: station.max_count },
      ];
  }
}

export default function TimeSlotSelector({ station, lotteryMode, selected, onSelect }: Props) {
  const options = getSlotOptions(station);

  // 개표참관은 자동선택
  if (station.type === 'counting' && !selected) {
    // 자동 선택 트리거
    setTimeout(() => onSelect('all'), 0);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">시간대를 선택하세요</h2>
      <div className={`grid gap-3 ${station.type === 'early' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {options.map((opt) => {
          const remaining = opt.max - opt.count;
          const full = remaining <= 0;
          const disabled = full && !lotteryMode;
          const isSelected = selected === opt.key;

          return (
            <button
              key={opt.key}
              onClick={() => !disabled && onSelect(opt.key)}
              disabled={disabled}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                disabled
                  ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  : isSelected
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 bg-white hover:border-yellow-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{opt.label}</div>
              <div className={`text-sm mt-1 ${full ? 'text-red-500' : 'text-green-600'}`}>
                {full ? (
                  lotteryMode ? '추첨 신청' : '마감'
                ) : (
                  `잔여 ${remaining}석`
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
