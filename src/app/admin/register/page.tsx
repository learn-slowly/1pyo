'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ObservationType, Station, StationsResponse } from '@/lib/types';
import { TIME_SLOT_LABELS } from '@/lib/constants';

const TYPE_OPTIONS: { value: ObservationType; label: string }[] = [
  { value: 'early', label: '사전투표' },
  { value: 'polling', label: '본투표' },
  { value: 'counting', label: '개표' },
];

function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function getTimeSlots(type: ObservationType): { value: string; label: string }[] {
  switch (type) {
    case 'polling': return [{ value: 'am', label: '오전' }, { value: 'pm', label: '오후' }];
    case 'early': return [
      { value: 'd1_am', label: '1일차 오전' }, { value: 'd1_pm', label: '1일차 오후' },
      { value: 'd2_am', label: '2일차 오전' }, { value: 'd2_pm', label: '2일차 오후' },
    ];
    case 'counting': return [{ value: 'all', label: '종일' }];
  }
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

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">불러오는 중...</div>}>
      <AdminRegisterContent />
    </Suspense>
  );
}

function AdminRegisterContent() {
  const searchParams = useSearchParams();

  // 투표소 선택
  const [type, setType] = useState<ObservationType>((searchParams.get('type') as ObservationType) || 'polling');
  const [sigungu, setSigungu] = useState(searchParams.get('sigungu') || '');
  const [stationId, setStationId] = useState(searchParams.get('stationId') || '');
  const [timeSlot, setTimeSlot] = useState(searchParams.get('timeSlot') || '');
  const [stationsData, setStationsData] = useState<StationsResponse | null>(null);
  const [initialized, setInitialized] = useState(false);

  // 신청자 정보
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'1' | '2' | ''>('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [account, setAccount] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);

  // 투표소 데이터 가져오기
  useEffect(() => {
    fetch(`/api/stations?type=${type}`)
      .then(r => r.json())
      .then(d => {
        setStationsData(d);
        if (!initialized) {
          setInitialized(true);
        } else {
          setSigungu(''); setStationId(''); setTimeSlot('');
        }
      });
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const sigunguList = stationsData?.sigunguList || [];
  const stations = stationsData?.stations.filter(s => !sigungu || s.sigungu === sigungu) || [];
  const selectedStation = stations.find(s => s.id === stationId);

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

  // 카카오 우편번호 스크립트
  useEffect(() => {
    if (document.getElementById('daum-postcode')) return;
    const script = document.createElement('script');
    script.id = 'daum-postcode';
    script.src = '//t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const resetForm = () => {
    setName(''); setPhone(''); setBirthDate(''); setGender('');
    setZipCode(''); setAddress(''); setAddressDetail('');
    setOccupation(''); setAccount('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !timeSlot || !name || !phone || !birthDate || !gender || !address || !occupation || !account) {
      setResult({ success: false, message: '모든 필수 항목을 입력해주세요.' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, birth_date: birthDate, gender,
          zip_code: zipCode, address, address_detail: addressDetail,
          occupation, account, type,
          station_id: selectedStation.id,
          station_name: selectedStation.station_name,
          sigungu: selectedStation.sigungu,
          time_slot: timeSlot,
        }),
      });
      const data = await res.json();
      setResult({ success: data.success, message: data.message });
      if (data.success) resetForm();
    } catch {
      setResult({ success: false, message: '등록 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">대리 신청</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 투표소 선택 */}
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">투표소 선택</h2>
          <p className="text-xs text-gray-500">현재 투표소는 2025년 6월 대선 기준이며, 사전투표소는 5월 19일, 본투표소는 5월 24일 선관위에서 확정됩니다.</p>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={`py-2 rounded-lg border-2 text-sm font-medium ${type === t.value ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={sigungu} onChange={(e) => { setSigungu(e.target.value); setStationId(''); }}
              className="p-2 border rounded-lg text-sm bg-white text-gray-700">
              <option value="">시군구 선택</option>
              {sigunguList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={stationId} onChange={(e) => setStationId(e.target.value)}
              className="p-2 border rounded-lg text-sm bg-white text-gray-700">
              <option value="">투표소 선택</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.station_name}</option>)}
            </select>
          </div>
          {selectedStation && (
            <div className="grid grid-cols-4 gap-2">
              {getTimeSlots(type).filter(ts => !isSlotFull(selectedStation, ts.value)).map(ts => (
                <button key={ts.value} type="button" onClick={() => setTimeSlot(ts.value)}
                  className={`py-2 rounded-lg border-2 text-xs font-medium ${timeSlot === ts.value ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}>
                  {ts.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 신청자 정보 */}
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
            <input type="text" value={address} readOnly placeholder="기본주소 *" className="flex-1 p-2 border rounded-lg text-sm bg-gray-50" />
          </div>
          <input type="text" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)}
            placeholder="상세주소" className="w-full p-2 border rounded-lg text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)}
              placeholder="직업 *" className="p-2 border rounded-lg text-sm" maxLength={20} />
            <input type="text" value={account} onChange={(e) => setAccount(e.target.value)}
              placeholder="계좌번호 *" className="p-2 border rounded-lg text-sm" maxLength={40} />
          </div>
        </div>

        {result && (
          <div className={`p-3 rounded-lg text-sm font-medium ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.message}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50">
          {loading ? '등록 중...' : '참관인 등록'}
        </button>
      </form>
    </div>
  );
}
