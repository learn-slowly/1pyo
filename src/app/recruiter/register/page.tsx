'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ObservationType, Station, StationsResponse } from '@/lib/types';

interface SlotSelection {
  enabled: boolean;
  sigungu: string;
  stationId: string;
  timeSlot: string;
}

interface SlotConfig {
  key: string;
  label: string;
  type: ObservationType;
  timeSlots: { value: string; label: string }[];
}

const SLOT_CONFIGS: SlotConfig[] = [
  { key: 'early_d1', label: '사전투표 1일차', type: 'early', timeSlots: [{ value: 'd1_am', label: '오전' }, { value: 'd1_pm', label: '오후' }] },
  { key: 'early_d2', label: '사전투표 2일차', type: 'early', timeSlots: [{ value: 'd2_am', label: '오전' }, { value: 'd2_pm', label: '오후' }] },
  { key: 'polling', label: '본투표', type: 'polling', timeSlots: [{ value: 'am', label: '오전' }, { value: 'pm', label: '오후' }] },
  { key: 'counting', label: '개표', type: 'counting', timeSlots: [{ value: 'all', label: '종일' }] },
];

function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function isSlotFull(station: Station, slotValue: string): boolean {
  switch (station.type) {
    case 'polling':
      if (slotValue === 'am') return station.am_count >= station.am_max;
      if (slotValue === 'pm') return station.pm_count >= station.pm_max;
      return false;
    case 'early': {
      const key = `${slotValue}_count` as keyof typeof station;
      return (station[key] as number) >= station.slot_max;
    }
    case 'counting':
      return station.current_count >= station.max_count;
  }
}

function isStationFullForConfig(station: Station, config: SlotConfig): boolean {
  return config.timeSlots.every(ts => isSlotFull(station, ts.value));
}

const emptySlot = (): SlotSelection => ({ enabled: false, sigungu: '', stationId: '', timeSlot: '' });

export default function RecruiterRegisterPage() {
  // 인적정보
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'1' | '2' | ''>('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // 슬롯 선택 (4개)
  const [slots, setSlots] = useState<Record<string, SlotSelection>>({
    early_d1: emptySlot(),
    early_d2: emptySlot(),
    polling: emptySlot(),
    counting: emptySlot(),
  });

  // 투표소 데이터
  const [stationsMap, setStationsMap] = useState<Record<string, StationsResponse>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean; details?: { type: string; station_name: string; success: boolean; message: string }[] } | null>(null);

  // 투표소 데이터 로드
  useEffect(() => {
    const types: ObservationType[] = ['early', 'polling', 'counting'];
    Promise.all(
      types.map(t => fetch(`/api/stations?type=${t}`).then(r => r.json()).then(d => ({ type: t, data: d as StationsResponse })))
    ).then(results => {
      const map: Record<string, StationsResponse> = {};
      for (const r of results) map[r.type] = r.data;
      setStationsMap(map);
    });
  }, []);

  // 카카오 우편번호
  useEffect(() => {
    if (document.getElementById('daum-postcode')) return;
    const script = document.createElement('script');
    script.id = 'daum-postcode';
    script.src = '//t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const openPostcode = useCallback(() => {
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete(data: { zonecode: string; roadAddress: string; jibunAddress: string; buildingName: string; userSelectedType: string }) {
        setZipCode(data.zonecode);
        const fullAddr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
        setAddress(fullAddr + (data.buildingName ? ` (${data.buildingName})` : ''));
        setAddressDetail('');
      },
    }).open();
  }, []);

  const updateSlot = (key: string, updates: Partial<SlotSelection>) => {
    setSlots(prev => ({ ...prev, [key]: { ...prev[key], ...updates } }));
  };

  const getStationsForSlot = (config: SlotConfig) => {
    const data = stationsMap[config.type];
    if (!data) return { sigunguList: [], stations: [] };
    const slot = slots[config.key];
    const filtered = data.stations.filter(s => (!slot.sigungu || s.sigungu === slot.sigungu) && !isStationFullForConfig(s, config));
    return { sigunguList: data.sigunguList, stations: filtered };
  };

  const enabledSlots = SLOT_CONFIGS.filter(c => slots[c.key].enabled);

  const resetForm = () => {
    setName(''); setPhone(''); setBirthDate(''); setGender('');
    setZipCode(''); setAddress(''); setAddressDetail('');
    setOccupation(''); setBankName(''); setAccountNumber('');
    setSlots({ early_d1: emptySlot(), early_d2: emptySlot(), polling: emptySlot(), counting: emptySlot() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone || !birthDate || !gender || !address || !occupation || !bankName || !accountNumber) {
      setResult({ success: false, message: '인적정보를 모두 입력해주세요.' });
      return;
    }

    if (enabledSlots.length === 0) {
      setResult({ success: false, message: '최소 1개 이상의 참관 유형을 선택해주세요.' });
      return;
    }

    for (const config of enabledSlots) {
      const slot = slots[config.key];
      if (!slot.stationId || !slot.timeSlot) {
        setResult({ success: false, message: `${config.label}: 투표소와 시간대를 선택해주세요.` });
        return;
      }
    }

    setLoading(true);
    setResult(null);

    const slotData = enabledSlots.map(config => {
      const slot = slots[config.key];
      const data = stationsMap[config.type];
      const station = data?.stations.find(s => s.id === slot.stationId);
      return {
        type: config.type,
        station_id: slot.stationId,
        station_name: station?.station_name || '',
        sigungu: station?.sigungu || '',
        time_slot: slot.timeSlot,
      };
    });

    try {
      const res = await fetch('/api/recruiter/register-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, birth_date: birthDate, gender,
          zip_code: zipCode, address, address_detail: addressDetail,
          occupation, account: `${bankName.trim()} ${accountNumber.trim()}`,
          slots: slotData,
        }),
      });
      const data = await res.json();
      setResult({
        success: data.success,
        message: data.message,
        details: data.results,
      });
      if (data.success) resetForm();
    } catch {
      setResult({ success: false, message: '등록 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">참관인 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 인적정보 */}
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">신청자 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="이름 *" className="p-2 border rounded-lg text-sm" maxLength={20} />
            <input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="연락처 *" className="p-2 border rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input type="text" inputMode="numeric" value={birthDate}
              onChange={(e) => setBirthDate(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
              placeholder="생년월일 *" className="p-2 border rounded-lg text-sm" />
            <div className="flex gap-2 col-span-2">
              {([['1', '남'], ['2', '여']] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setGender(v)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium ${gender === v ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <input type="text" value={zipCode} readOnly placeholder="우편번호" className="w-24 p-2 border rounded-lg text-sm bg-gray-50" />
            <button type="button" onClick={openPostcode} className="px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-medium">주소 검색</button>
          </div>
          <input type="text" value={address} readOnly placeholder="기본주소 *" className="w-full p-2 border rounded-lg text-sm bg-gray-50" />
          <input type="text" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)}
            placeholder="상세주소" className="w-full p-2 border rounded-lg text-sm" />
          <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)}
            placeholder="직업 *" className="w-full p-2 border rounded-lg text-sm" maxLength={20} />
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
              placeholder="은행명 *" className="p-2 border rounded-lg text-sm" maxLength={10} />
            <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="계좌번호 *" className="p-2 border rounded-lg text-sm" maxLength={30} />
          </div>
        </div>

        {/* 참관 유형 선택 */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700">참관 유형 선택 <span className="font-normal text-gray-400">(최대 4개)</span></h2>

          {SLOT_CONFIGS.map(config => {
            const slot = slots[config.key];
            const isEarlyDisabled = config.type === 'early';
            const { sigunguList, stations } = getStationsForSlot(config);
            const selectedStation = stations.find(s => s.id === slot.stationId);

            return (
              <div key={config.key} className={`bg-white border rounded-xl overflow-hidden ${isEarlyDisabled ? 'opacity-60' : slot.enabled ? 'border-yellow-400' : ''}`}>
                {/* 토글 헤더 */}
                <button
                  type="button"
                  disabled={isEarlyDisabled}
                  onClick={() => !isEarlyDisabled && updateSlot(config.key, { enabled: !slot.enabled, sigungu: '', stationId: '', timeSlot: '' })}
                  className={`w-full px-4 py-3 flex items-center justify-between text-left ${isEarlyDisabled ? 'cursor-not-allowed' : ''}`}
                >
                  <div>
                    <span className={`text-sm font-bold ${isEarlyDisabled ? 'text-gray-400' : slot.enabled ? 'text-yellow-700' : 'text-gray-500'}`}>
                      {config.label}
                    </span>
                    {isEarlyDisabled && (
                      <p className="text-xs text-orange-600 mt-0.5">5/15 후보등록 이후 모집 여부를 검토하여 안내드립니다.</p>
                    )}
                  </div>
                  {!isEarlyDisabled && (
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${slot.enabled ? 'bg-yellow-400 justify-end' : 'bg-gray-200 justify-start'}`}>
                      <div className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
                    </div>
                  )}
                </button>

                {/* 선택 UI */}
                {slot.enabled && (
                  <div className="px-4 pb-4 space-y-2 border-t">
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      <select value={slot.sigungu}
                        onChange={(e) => updateSlot(config.key, { sigungu: e.target.value, stationId: '', timeSlot: '' })}
                        className="p-2 border rounded-lg text-sm bg-white text-gray-700">
                        <option value="">시군구 선택</option>
                        {sigunguList.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={slot.stationId}
                        onChange={(e) => updateSlot(config.key, { stationId: e.target.value, timeSlot: '' })}
                        className="p-2 border rounded-lg text-sm bg-white text-gray-700">
                        <option value="">투표소 선택</option>
                        {stations.map(s => <option key={s.id} value={s.id}>{s.station_name}</option>)}
                      </select>
                    </div>

                    {selectedStation && (
                      <>
                        <p className="text-xs text-gray-500 px-1">{selectedStation.building_name ? `${selectedStation.building_name}(${selectedStation.address})` : selectedStation.address}</p>
                        <div className="flex gap-2">
                          {config.timeSlots
                            .filter(ts => !isSlotFull(selectedStation, ts.value))
                            .map(ts => (
                              <button key={ts.value} type="button"
                                onClick={() => updateSlot(config.key, { timeSlot: ts.value })}
                                className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium ${
                                  slot.timeSlot === ts.value ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                                }`}>
                                {ts.label}
                              </button>
                            ))}
                        </div>
                      </>
                    )}

                    {slot.stationId && slot.timeSlot && (
                      <p className="text-xs text-green-600 font-medium">
                        {selectedStation?.station_name} / {config.timeSlots.find(t => t.value === slot.timeSlot)?.label}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 결과 */}
        {result && (
          <div className={`p-3 rounded-lg text-sm font-medium ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p>{result.message}</p>
            {result.details && (
              <ul className="mt-2 space-y-1">
                {result.details.map((d, i) => (
                  <li key={i} className={`text-xs ${d.success ? 'text-green-600' : 'text-red-600'}`}>
                    {d.success ? '  ' : '  '} {d.station_name} — {d.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 선택된 슬롯 요약 */}
        {enabledSlots.length > 0 && (
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50">
            {loading ? '등록 중...' : `${enabledSlots.length}건 일괄 등록`}
          </button>
        )}
      </form>
    </div>
  );
}
