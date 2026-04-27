'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Station } from '@/lib/types';

const TYPE_OPTIONS = [
  { value: 'polling', label: '본투표' },
  { value: 'counting', label: '개표' },
] as const;

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

function hasVacancy(station: Station): boolean {
  return getSlotInfo(station).some(s => s.count < s.max);
}

function totalVacancies(station: Station): number {
  return getSlotInfo(station).reduce((sum, s) => sum + Math.max(0, s.max - s.count), 0);
}

export default function RecruiterVacanciesPage() {
  const [type, setType] = useState<'early' | 'polling' | 'counting'>('polling');
  const [sigungu, setSigungu] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [sigunguList, setSigunguList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (sigungu) params.set('sigungu', sigungu);
      const res = await fetch(`/api/stations?${params}`, { cache: 'no-store' });
      const data = await res.json();
      setStations(data.stations || []);
      setSigunguList(data.sigunguList || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [type, sigungu]);

  useEffect(() => { fetchStations(); }, [fetchStations]);

  const vacant = stations.filter(hasVacancy);
  const grouped = new Map<string, Station[]>();
  for (const s of vacant) {
    const key = s.sigungu;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  const totalVacant = vacant.reduce((sum, s) => sum + totalVacancies(s), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">빈자리 현황</h1>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">전체 투표소</p>
          <p className="text-2xl font-bold text-gray-900">{stations.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">빈곳</p>
          <p className="text-2xl font-bold text-green-600">{vacant.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">빈 슬롯 수</p>
          <p className="text-2xl font-bold text-green-600">{totalVacant}</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={type} onChange={(e) => { setType(e.target.value as typeof type); setSigungu(''); }}
          className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-700">
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={sigungu} onChange={(e) => setSigungu(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-700">
          <option value="">전체 지역</option>
          {sigunguList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : vacant.length === 0 ? (
        <div className="text-center py-12 text-gray-400">빈자리가 없습니다</div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([region, regionStations]) => (
            <div key={region}>
              <h2 className="text-sm font-bold text-gray-700 mb-2">
                {region}
                <span className="ml-2 font-normal text-gray-400">
                  {regionStations.length}곳 · 빈 슬롯 {regionStations.reduce((s, st) => s + totalVacancies(st), 0)}개
                </span>
              </h2>
              <div className="grid gap-2">
                {regionStations.map((station) => {
                  const slots = getSlotInfo(station);
                  return (
                    <div key={station.id} className="bg-white border rounded-xl p-3">
                      <div className="mb-2">
                        <p className="font-medium text-sm text-gray-900">{station.station_name}</p>
                        <p className="text-xs text-gray-500">
                          {station.building_name ? `${station.building_name}(${station.address})` : station.address}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {slots.map((slot) => {
                          const full = slot.max - slot.count <= 0;
                          return (
                            <span key={slot.label} className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                              full ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-700'
                            }`}>
                              {slot.label} {slot.count}/{slot.max}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
