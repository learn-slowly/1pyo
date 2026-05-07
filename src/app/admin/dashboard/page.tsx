'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
  zipCode: string;
  address: string;
  addressDetail: string;
  occupation: string;
  account: string;
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
  memo: string;
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

interface CheckboxDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}

function CheckboxDropdown({ label, options, selected, onChange }: CheckboxDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  const active = selected.length > 0;
  const displayLabel = active
    ? options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')
    : label;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`px-3 py-2 border rounded-lg text-sm bg-white flex items-center gap-1.5 hover:bg-gray-50 max-w-[180px] ${active ? 'border-yellow-400 text-yellow-800 font-medium' : 'text-gray-700'}`}
      >
        <span className="truncate">{displayLabel}</span>
        <span className="text-gray-400 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 bg-white border rounded-lg shadow-lg min-w-[140px] py-1">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="accent-yellow-400"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
          {active && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 border-t mt-1"
            >
              선택 해제
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sigunguList, setSigunguList] = useState<string[]>([]);
  const [recruiterList, setRecruiterList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterSigungus, setFilterSigungus] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterRecruiters, setFilterRecruiters] = useState<string[]>([]);
  const [filterAddress, setFilterAddress] = useState('');
  const [filterAddressInput, setFilterAddressInput] = useState('');
  const [filterMemo, setFilterMemo] = useState('');
  const [filterMemoInput, setFilterMemoInput] = useState('');

  const [excludeSelfMember, setExcludeSelfMember] = useState(false);
  const [citizenOnly, setCitizenOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filterTypes.length > 0) params.set('type', filterTypes.join(','));
    if (filterSigungus.length > 0) params.set('sigungu', filterSigungus.join(','));
    if (filterStatuses.length > 0) params.set('status', filterStatuses.join(','));
    if (filterRecruiters.length > 0) params.set('recruiter', filterRecruiters.join(','));
    if (filterAddress) params.set('address', filterAddress);
    if (filterMemo) params.set('memo', filterMemo);
    if (excludeSelfMember) params.set('excludeSelfMember', '1');
    if (citizenOnly) params.set('citizenOnly', '1');
    return params;
  }, [filterTypes, filterSigungus, filterStatuses, filterRecruiters, filterAddress, filterMemo, excludeSelfMember, citizenOnly]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/applicants?${buildParams()}`);
      const data = await res.json();
      if (data.success) {
        setApplicants(data.applicants);
        setStats(data.stats);
        if (data.sigunguList) setSigunguList(data.sigunguList);
        if (data.recruiterList) setRecruiterList(data.recruiterList);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [buildParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/download?${buildParams()}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disp = res.headers.get('Content-Disposition') || '';
      const match = disp.match(/filename\*=UTF-8''(.+)/);
      a.download = match ? decodeURIComponent(match[1]) : '신청자인적사항.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    finally { setDownloading(false); }
  };

  const handleMemoSave = async (app: Applicant, newMemo: string) => {
    if (newMemo === (app.memo || '')) return;
    try {
      const res = await fetch('/api/admin/applicants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName: app.sheetName, rowIndex: app.rowIndex, memo: newMemo }),
      });
      const data = await res.json();
      if (data.success) {
        setApplicants(prev => prev.map(a =>
          a.sheetName === app.sheetName && a.rowIndex === app.rowIndex ? { ...a, memo: newMemo } : a
        ));
      }
    } catch { /* ignore */ }
  };

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

  const typeOptions = [
    { value: 'polling', label: '본투표' },
    { value: 'early', label: '사전투표' },
    { value: 'counting', label: '개표' },
  ];
  const statusOptions = [
    { value: 'applied', label: '신청완료' },
    { value: 'confirmed', label: '확정' },
    { value: 'lottery', label: '추첨대기' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">신청 현황</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-3 py-1.5 text-sm bg-yellow-400 text-yellow-900 font-medium rounded-lg hover:bg-yellow-500 disabled:opacity-50"
          >
            {downloading ? '처리 중...' : '인적사항 엑셀 다운로드'}
          </button>
          <a href="/admin/vacancies" className="text-sm text-yellow-600 font-medium hover:text-yellow-700">빈자리 현황 →</a>
        </div>
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
        <CheckboxDropdown
          label="전체 유형"
          options={typeOptions}
          selected={filterTypes}
          onChange={setFilterTypes}
        />
        <CheckboxDropdown
          label="전체 지역"
          options={sigunguList.map(s => ({ value: s, label: s }))}
          selected={filterSigungus}
          onChange={setFilterSigungus}
        />
        <CheckboxDropdown
          label="전체 상태"
          options={statusOptions}
          selected={filterStatuses}
          onChange={setFilterStatuses}
        />
        <CheckboxDropdown
          label="전체 모집책"
          options={[
            { value: '__none__', label: '(없음)' },
            ...recruiterList.map(r => ({ value: r, label: r })),
          ]}
          selected={filterRecruiters}
          onChange={setFilterRecruiters}
        />
        <form
          onSubmit={(e) => { e.preventDefault(); setFilterAddress(filterAddressInput); }}
          className="flex gap-1"
        >
          <input
            type="text"
            value={filterAddressInput}
            onChange={(e) => setFilterAddressInput(e.target.value)}
            placeholder="주소 검색..."
            className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-700 w-36 focus:outline-none focus:border-yellow-400"
          />
          <button type="submit" className="px-2 py-2 border rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50">검색</button>
          {filterAddress && (
            <button type="button" onClick={() => { setFilterAddress(''); setFilterAddressInput(''); }}
              className="px-2 py-2 text-sm text-gray-400 hover:text-gray-600">✕</button>
          )}
        </form>
        <form
          onSubmit={(e) => { e.preventDefault(); setFilterMemo(filterMemoInput); }}
          className="flex gap-1"
        >
          <input
            type="text"
            value={filterMemoInput}
            onChange={(e) => setFilterMemoInput(e.target.value)}
            placeholder="메모 검색..."
            className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-700 w-36 focus:outline-none focus:border-yellow-400"
          />
          <button type="submit" className="px-2 py-2 border rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50">검색</button>
          {filterMemo && (
            <button type="button" onClick={() => { setFilterMemo(''); setFilterMemoInput(''); }}
              className="px-2 py-2 text-sm text-gray-400 hover:text-gray-600">✕</button>
          )}
        </form>
        <button
          type="button"
          onClick={() => setExcludeSelfMember(v => !v)}
          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${excludeSelfMember ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          당원 본인 제외{excludeSelfMember ? ' ✓' : ''}
        </button>
        <button
          type="button"
          onClick={() => setCitizenOnly(v => !v)}
          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${citizenOnly ? 'bg-yellow-400 border-yellow-400 text-yellow-900' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          일반 시민만{citizenOnly ? ' ✓' : ''}
        </button>
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
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">비고</th>
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
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      defaultValue={app.memo}
                      onBlur={(e) => handleMemoSave(app, e.target.value.slice(0, 200))}
                      maxLength={200}
                      placeholder="메모..."
                      className="w-40 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-yellow-400 bg-white"
                    />
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
