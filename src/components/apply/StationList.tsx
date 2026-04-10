'use client';

import { useState } from 'react';
import type { Station } from '@/lib/types';
import StationCard from './StationCard';

interface Props {
  stations: Station[];
  lotteryMode: boolean;
  selectedStation: Station | null;
  onSelect: (station: Station) => void;
  loading?: boolean;
}

function hasAvailableSlot(station: Station): boolean {
  switch (station.type) {
    case 'polling':
      return station.am_count < station.am_max || station.pm_count < station.pm_max;
    case 'early':
      return (
        station.d1_am_count < station.slot_max ||
        station.d1_pm_count < station.slot_max ||
        station.d2_am_count < station.slot_max ||
        station.d2_pm_count < station.slot_max
      );
    case 'counting':
      return station.current_count < station.max_count;
  }
}

export default function StationList({ stations, lotteryMode, selectedStation, onSelect, loading }: Props) {
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">투표소를 선택하세요</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const filtered = showAvailableOnly
    ? stations.filter(s => hasAvailableSlot(s))
    : stations;

  const availableCount = stations.filter(s => hasAvailableSlot(s)).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          투표소를 선택하세요
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({availableCount}/{stations.length}곳 잔여)
          </span>
        </h2>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={showAvailableOnly}
          onChange={(e) => setShowAvailableOnly(e.target.checked)}
          className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
        />
        빈 곳만 보기
      </label>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {showAvailableOnly
            ? '잔여석이 있는 투표소가 없습니다.'
            : '투표소가 없습니다.'}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              lotteryMode={lotteryMode}
              isSelected={selectedStation?.id === station.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
