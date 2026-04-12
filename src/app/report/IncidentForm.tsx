'use client';

import { useState } from 'react';
import type { ObservationType } from '@/lib/types';

const INCIDENT_TYPES = [
  '대리투표 의심',
  '기표소 내 촬영',
  '투표함 봉인 훼손',
  '참관인에 대한 부당한 제한',
  '유·무효 판정 이의',
  '절차 위반',
  '선관위 직원과 마찰',
  '기타',
];

export default function IncidentForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [observationType, setObservationType] = useState<ObservationType>('polling');
  const [stationName, setStationName] = useState('');
  const [sigungu, setSigungu] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [objectionFiled, setObjectionFiled] = useState(false);
  const [objectionResult, setObjectionResult] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const formatPhone = (value: string) => {
    const nums = value.replace(/[^0-9]/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: 'incident',
          reporter_name: name,
          reporter_phone: phone,
          observation_type: observationType,
          station_name: stationName,
          sigungu,
          incident_type: incidentType,
          description,
          objection_filed: objectionFiled,
          objection_result: objectionResult,
        }),
      });
      const data = await res.json();
      setResult(data);

      if (data.success) {
        // 성공 시 내용만 초기화
        setIncidentType('');
        setDescription('');
        setObjectionFiled(false);
        setObjectionResult('');
      }
    } catch {
      setResult({ success: false, message: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 참관인 정보 */}
      <fieldset className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-1">참관인 정보</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="홍길동"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">연락처</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="010-1234-5678"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
        </div>
      </fieldset>

      {/* 참관 장소 */}
      <fieldset className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-1">참관 장소</legend>

        <div>
          <label className="block text-xs text-gray-500 mb-1">참관 유형</label>
          <div className="grid grid-cols-3 gap-2">
            {([['polling', '본투표'], ['early', '사전투표'], ['counting', '개표']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setObservationType(value)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  observationType === value
                    ? 'bg-yellow-400 border-yellow-400 text-gray-900'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">시군구</label>
            <input
              type="text"
              value={sigungu}
              onChange={e => setSigungu(e.target.value)}
              placeholder="진주시"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">참관 장소명</label>
            <input
              type="text"
              value={stationName}
              onChange={e => setStationName(e.target.value)}
              placeholder="진주초등학교"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
        </div>
      </fieldset>

      {/* 특이사항 내용 */}
      <fieldset className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-1">특이사항</legend>

        <div>
          <label className="block text-xs text-gray-500 mb-1">상황 유형</label>
          <div className="grid grid-cols-2 gap-1.5">
            {INCIDENT_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setIncidentType(type)}
                className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                  incidentType === type
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">상세 내용</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="시간, 내용, 상대방 등을 가능한 자세히 기록해주세요"
            required
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={objectionFiled}
              onChange={e => setObjectionFiled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
            />
            <span className="text-sm text-gray-700">이의 제기함</span>
          </label>
        </div>

        {objectionFiled && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">이의 제기 결과</label>
            <input
              type="text"
              value={objectionResult}
              onChange={e => setObjectionResult(e.target.value)}
              placeholder="예: 구두 이의 → 시정됨"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
        )}
      </fieldset>

      {/* 결과 메시지 */}
      {result && (
        <div className={`p-3 rounded-lg text-sm ${
          result.success
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {result.message}
        </div>
      )}

      {/* 제출 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '보고 중...' : '특이사항 보고'}
      </button>
    </form>
  );
}
