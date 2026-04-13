'use client';

import type { Station } from '@/lib/types';

interface Props {
  station: Station;
  lotteryMode: boolean;
  isSelected: boolean;
  onSelect: (station: Station) => void;
}

function getSlotInfo(station: Station): { label: string; count: number; max: number }[] {
  switch (station.type) {
    case 'polling':
      return [
        { label: '오전', count: station.am_count, max: station.am_max },
        { label: '오후', count: station.pm_count, max: station.pm_max },
      ];
    case 'early':
      return [
        { label: '5/29 오전', count: station.d1_am_count, max: station.slot_max },
        { label: '5/29 오후', count: station.d1_pm_count, max: station.slot_max },
        { label: '5/30 오전', count: station.d2_am_count, max: station.slot_max },
        { label: '5/30 오후', count: station.d2_pm_count, max: station.slot_max },
      ];
    case 'counting':
      return [
        { label: '전체', count: station.current_count, max: station.max_count },
      ];
  }
}

function isStationFull(station: Station): boolean {
  const slots = getSlotInfo(station);
  return slots.every(s => s.count >= s.max);
}

export default function StationCard({ station, lotteryMode, isSelected, onSelect }: Props) {
  const slots = getSlotInfo(station);
  const full = isStationFull(station);
  const disabled = full && !lotteryMode;

  return (
    <button
      onClick={() => !disabled && onSelect(station)}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        disabled
          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
          : isSelected
            ? 'border-yellow-400 bg-yellow-50'
            : 'border-gray-200 bg-white hover:border-yellow-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate">{station.station_name}</div>
          {station.building_name && (
            <div className="text-sm text-gray-700 truncate">{station.building_name}</div>
          )}
          <div className="text-sm text-gray-500 truncate">{station.address}</div>
        </div>
        {full && !lotteryMode && (
          <span className="shrink-0 px-2 py-0.5 text-xs font-bold text-red-600 bg-red-50 rounded-full">
            마감
          </span>
        )}
        {full && lotteryMode && (
          <span className="shrink-0 px-2 py-0.5 text-xs font-bold text-yellow-700 bg-yellow-100 rounded-full">
            추첨
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {slots.map((slot) => {
          const remaining = slot.max - slot.count;
          const slotFull = remaining <= 0;
          return (
            <div
              key={slot.label}
              className={`text-xs px-2 py-1 rounded-md ${
                slotFull
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {slot.label}{' '}
              <span className="font-semibold">
                {slot.count}/{slot.max}
              </span>
            </div>
          );
        })}
      </div>
    </button>
  );
}
