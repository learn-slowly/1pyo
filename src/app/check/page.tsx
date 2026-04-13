'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ApplicationResult {
  type: string;
  stationName: string;
  sigungu: string;
  timeSlotLabel: string;
  status: string;
  statusLabel: string;
  applicationId: string;
  timestamp: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function CheckPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApplicationResult[] | null>(null);
  const [message, setMessage] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || phone.replace(/[^0-9]/g, '').length < 10) return;

    setLoading(true);
    setMessage('');
    setResults(null);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone }),
      });
      const data = await res.json();
      setResults(data.results || []);
      if (data.message && (!data.results || data.results.length === 0)) {
        setMessage(data.message);
      }
    } catch {
      setMessage('조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      <div className="max-w-lg mx-auto px-4 py-6 w-full flex-1">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">내 신청 확인</h1>
          <p className="text-sm text-gray-500 mt-1">2026한표</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              id="name" type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              maxLength={20}
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input
              id="phone" type="tel" inputMode="numeric" value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-1234-5678"
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {loading ? '조회 중...' : '조회하기'}
          </button>
        </form>

        {/* 결과 */}
        {searched && results && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">{results.length}건의 신청 내역</p>
            {results.map((r, i) => (
              <div key={i} className="border rounded-xl p-4 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{r.type}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    r.status === 'lottery'
                      ? 'bg-yellow-100 text-yellow-700'
                      : r.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}>
                    {r.statusLabel}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">투표소</span>
                    <span className="text-gray-900">{r.stationName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">지역</span>
                    <span className="text-gray-900">{r.sigungu}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">시간대</span>
                    <span className="text-gray-900">{r.timeSlotLabel}</span>
                  </div>
                  {r.applicationId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">신청번호</span>
                      <span className="text-gray-900 font-mono text-xs">{r.applicationId}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {searched && results && results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">{message || '신청 내역이 없습니다.'}</p>
            <Link
              href="/apply"
              className="inline-block mt-4 px-6 py-2 bg-yellow-400 text-gray-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors"
            >
              참관인 신청하기
            </Link>
          </div>
        )}

        {message && !results && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {message}
          </div>
        )}
      </div>

      <div className="text-center py-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← 처음으로
        </Link>
      </div>
    </div>
  );
}
