'use client';

import { useState } from 'react';

const HOURS = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

export default function VoterCountForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [observationType, setObservationType] = useState<'polling' | 'early'>('polling');
  const [stationName, setStationName] = useState('');
  const [sigungu, setSigungu] = useState('');
  const [hour, setHour] = useState('');
  const [voters, setVoters] = useState('');
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
          report_type: 'voter_count',
          reporter_name: name,
          reporter_phone: phone,
          observation_type: observationType,
          station_name: stationName,
          sigungu,
          report_hour: hour,
          cumulative_voters: parseInt(voters) || 0,
        }),
      });
      const data = await res.json();
      setResult(data);

      if (data.success) {
        // 성공 시 시간/인수만 초기화 (같은 투표소에서 계속 보고)
        setHour('');
        setVoters('');
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

      {/* 투표소 정보 */}
      <fieldset className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-1">투표소 정보</legend>

        <div>
          <label className="block text-xs text-gray-500 mb-1">참관 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {([['polling', '본투표'], ['early', '사전투표']] as const).map(([value, label]) => (
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
            <label className="block text-xs text-gray-500 mb-1">투표소명</label>
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

      {/* 투표인수 */}
      <fieldset className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-1">투표인수</legend>

        <div>
          <label className="block text-xs text-gray-500 mb-1">시간대</label>
          <div className="grid grid-cols-5 gap-1.5">
            {HOURS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setHour(h)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  hour === h
                    ? 'bg-yellow-400 border-yellow-400 text-gray-900'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {h}시
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">누적 투표인수</label>
          <input
            type="number"
            value={voters}
            onChange={e => setVoters(e.target.value)}
            placeholder="0"
            min={0}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">해당 시각까지의 누적 투표인수를 입력해주세요</p>
        </div>
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
        className="w-full py-3.5 bg-yellow-400 text-gray-900 font-bold rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '보고 중...' : '투표인수 보고'}
      </button>
    </form>
  );
}
