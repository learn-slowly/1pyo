'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Station } from '@/lib/types';

const TYPE_OPTIONS = [
  { value: 'early', label: '사전투표' },
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

function getSlotKeys(station: Station): string[] {
  switch (station.type) {
    case 'polling': return ['am', 'pm'];
    case 'early': return ['d1_am', 'd1_pm', 'd2_am', 'd2_pm'];
    case 'counting': return ['all'];
  }
}

function hasVacancy(station: Station): boolean {
  return getSlotInfo(station).some(s => s.count < s.max);
}

function totalVacancies(station: Station): number {
  return getSlotInfo(station).reduce((sum, s) => sum + Math.max(0, s.max - s.count), 0);
}

export default function VacanciesPage() {
  const router = useRouter();
  const [type, setType] = useState<'early' | 'polling' | 'counting'>('early');
  const [sigungu, setSigungu] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [sigunguList, setSigunguList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (sigungu) params.set('sigungu', sigungu);
      const res = await fetch(`/api/stations?${params}`);
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
        <a href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← 신청 현황</a>
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
              <div className="overflow-x-auto border rounded-xl bg-white">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">투표소</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">장소</th>
                      {type === 'polling' && (
                        <>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">오전</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">오후</th>
                        </>
                      )}
                      {type === 'early' && (
                        <>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">5/29 오전</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">5/29 오후</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">5/30 오전</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">5/30 오후</th>
                        </>
                      )}
                      {type === 'counting' && (
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">현황</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {regionStations.map((station) => {
                      const slots = getSlotInfo(station);
                      const slotKeys = getSlotKeys(station);
                      return (
                        <tr key={station.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{station.station_name}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-500">{station.building_name || '-'}</td>
                          {slots.map((slot, i) => {
                            const remaining = slot.max - slot.count;
                            const full = remaining <= 0;
                            return (
                              <td key={slot.label} className="px-3 py-2 text-center whitespace-nowrap">
                                {full ? (
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                                    {slot.count}/{slot.max}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      const params = new URLSearchParams({
                                        type,
                                        sigungu: station.sigungu,
                                        stationId: station.id,
                                        timeSlot: slotKeys[i],
                                      });
                                      router.push(`/admin/register?${params}`);
                                    }}
                                    className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer transition-colors"
                                  >
                                    {slot.count}/{slot.max}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
