'use client';

import { useState, useEffect, useCallback } from 'react';

interface Applicant {
  rowIndex: number;
  sheetName: string;
  type: string;
  typeLabel: string;
  serialNo: string;
  name: string;
  phone: string;
  birthDate: string;
  gender: string;
  stationId: string;
  timeSlot: string;
  timeSlotLabel: string;
  stationName: string;
  sigungu: string;
  applicationId: string;
  timestamp: string;
  status: string;
  notes: string;
  recruiter: string;
}

interface Stats {
  total: number;
  totalSlots: number;
  byType: Record<string, { filled: number; total: number }>;
  byStatus: Record<string, number>;
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

export default function DashboardPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sigunguList, setSigunguList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterSigungu, setFilterSigungu] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set('type', filterType);
    if (filterSigungu) params.set('sigungu', filterSigungu);
    if (filterStatus) params.set('status', filterStatus);

    try {
      const res = await fetch(`/api/admin/applicants?${params}`);
      const data = await res.json();
      if (data.success) {
        setApplicants(data.applicants);
        setStats(data.stats);
        if (data.sigunguList) setSigunguList(data.sigunguList);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filterType, filterSigungu, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (app: Applicant, newStatus: string) => {
    setActionLoading(app.applicationId);
    try {
      const res = await fetch('/api/admin/applicants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName: app.sheetName, rowIndex: app.rowIndex, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) await fetchData();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (app: Applicant) => {
    if (!confirm(`${app.name}님의 신청을 삭제하시겠습니까?`)) return;
    setActionLoading(app.applicationId);
    try {
      const res = await fetch('/api/admin/applicants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: app.sheetName,
          rowIndex: app.rowIndex,
          type: app.type,
          stationId: app.stationId,
          timeSlot: app.timeSlot,
        }),
      });
      const data = await res.json();
      if (data.success) await fetchData();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">신청 현황</h1>
        <a href="/admin/vacancies" className="text-sm text-yellow-600 font-medium hover:text-yellow-700">빈자리 현황 →</a>
      </div>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">전체 신청</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}<span className="text-sm font-normal text-gray-400">/{stats.totalSlots}</span></p>
          </div>
          {Object.entries(stats.byType).map(([key, val]) => (
            <div key={key} className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">{TYPE_LABELS[key] || key}</p>
              <p className="text-2xl font-bold text-gray-900">{val.filled}<span className="text-sm font-normal text-gray-400">/{val.total}</span></p>
            </div>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-700">
          <option value="">전체 유형</option>
          <option value="polling">본투표</option>
          <option value="early">사전투표</option>
          <option value="counting">개표</option>
        </select>
        <select value={filterSigungu} onChange={(e) => setFilterSigungu(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-700">
          <option value="">전체 지역</option>
          {sigunguList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-700">
          <option value="">전체 상태</option>
          <option value="applied">신청완료</option>
          <option value="confirmed">확정</option>
          <option value="lottery">추첨대기</option>
        </select>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : applicants.length === 0 ? (
        <div className="text-center py-12 text-gray-400">신청 내역이 없습니다</div>
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
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">모집책</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">관리</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((app) => (
                <tr key={`${app.sheetName}-${app.rowIndex}`} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.typeLabel}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium">
                    <a
                      href={`/check?name=${encodeURIComponent(app.name)}&phone=${encodeURIComponent(app.phone)}`}
                      target="_blank"
                      className="text-yellow-700 hover:text-yellow-900 underline decoration-yellow-300"
                    >{app.name}</a>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.phone}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.sigungu}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.stationName}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{app.timeSlotLabel}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{app.recruiter}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex gap-1">
                      {app.status !== 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(app, 'confirmed')}
                          disabled={actionLoading === app.applicationId}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                        >확정</button>
                      )}
                      {app.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(app, 'applied')}
                          disabled={actionLoading === app.applicationId}
                          className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50"
                        >취소</button>
                      )}
                      <button
                        onClick={() => handleDelete(app)}
                        disabled={actionLoading === app.applicationId}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50"
                      >삭제</button>
                    </div>
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
