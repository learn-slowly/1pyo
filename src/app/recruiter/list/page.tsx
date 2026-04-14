'use client';

import { useState, useEffect } from 'react';

interface Applicant {
  type: string;
  typeLabel: string;
  name: string;
  phone: string;
  birthDate: string;
  gender: string;
  sigungu: string;
  stationName: string;
  timeSlot: string;
  timeSlotLabel: string;
  timestamp: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  applied: '신청완료',
  confirmed: '확정',
  lottery: '추첨대기',
};

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  lottery: 'bg-yellow-100 text-yellow-700',
};

const TYPE_LABELS: Record<string, string> = {
  polling: '본투표',
  early: '사전투표',
  counting: '개표',
};

export default function RecruiterListPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [total, setTotal] = useState(0);
  const [recruiterName, setRecruiterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/recruiter/applicants')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setApplicants(data.applicants);
          setTotal(data.total);
          setRecruiterName(data.recruiterName);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterType ? applicants.filter(a => a.type === filterType) : applicants;

  const byType = applicants.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleDownload = () => {
    window.location.href = '/api/recruiter/download';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">내 모집 현황</h1>
          {recruiterName && (
            <p className="text-sm text-gray-500 mt-0.5">{recruiterName}님이 모집한 참관인 목록</p>
          )}
        </div>
        <button
          onClick={handleDownload}
          disabled={total === 0}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          엑셀 다운로드
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">전체 모집</p>
          <p className="text-2xl font-bold text-gray-900">{total}<span className="text-sm font-normal text-gray-400">명</span></p>
        </div>
        {Object.entries(byType).map(([key, count]) => (
          <div key={key} className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">{TYPE_LABELS[key] || key}</p>
            <p className="text-2xl font-bold text-gray-900">{count}<span className="text-sm font-normal text-gray-400">명</span></p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-700">
          <option value="">전체 유형</option>
          <option value="polling">본투표</option>
          <option value="early">사전투표</option>
          <option value="counting">개표</option>
        </select>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {total === 0 ? '아직 모집한 참관인이 없습니다' : '해당 조건의 참관인이 없습니다'}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">유형</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">이름</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">연락처</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">시군구</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">투표소</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">시간대</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">신청일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, idx) => (
                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.typeLabel}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{app.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.phone}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.sigungu}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.stationName}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.timeSlotLabel}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                    {app.timestamp ? new Date(app.timestamp).toLocaleDateString('ko-KR') : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
