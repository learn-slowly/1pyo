'use client';

import { useState, useEffect, useCallback } from 'react';

interface Recruiter {
  rowIndex: number;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function RecruitersPage() {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newlyAdded, setNewlyAdded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchRecruiters = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/recruiters');
      const data = await res.json();
      if (data.success) setRecruiters(data.recruiters);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecruiters(); }, [fetchRecruiters]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/recruiters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.success && data.recruiter) {
        setResult({ success: true, message: `${data.recruiter.name}님 추가 완료! 코드: ${data.recruiter.code}` });
        setNewName('');
        setNewlyAdded(data.recruiter.code);
        setTimeout(() => setNewlyAdded(null), 5000);
        await fetchRecruiters();
      } else {
        setResult({ success: data.success, message: data.message });
      }
    } catch {
      setResult({ success: false, message: '추가 중 오류가 발생했습니다.' });
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (r: Recruiter) => {
    const newStatus = r.status === 'active' ? 'inactive' : 'active';
    setActionLoading(r.rowIndex);
    try {
      const res = await fetch('/api/admin/recruiters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: r.rowIndex, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) await fetchRecruiters();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (r: Recruiter) => {
    if (!confirm(`${r.name}님을 삭제하시겠습니까?`)) return;
    setActionLoading(r.rowIndex);
    try {
      const res = await fetch('/api/admin/recruiters', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: r.rowIndex }),
      });
      const data = await res.json();
      if (data.success) await fetchRecruiters();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const copyCode = (code: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      }).catch(() => fallbackCopy(code));
    } else {
      fallbackCopy(code);
    }
  };

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const activeCount = recruiters.filter(r => r.status === 'active').length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">모집책 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">활성 {activeCount}명 / 전체 {recruiters.length}명</p>
        </div>
      </div>

      {/* 모집책 추가 */}
      <form onSubmit={handleAdd} className="bg-white border rounded-xl p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-3">모집책 추가</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="이름 입력"
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
            maxLength={20}
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="px-4 py-2 bg-yellow-400 text-gray-900 font-bold text-sm rounded-lg hover:bg-yellow-500 disabled:opacity-50"
          >
            {adding ? '추가 중...' : '추가'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">추가하면 로그인 코드가 자동 생성됩니다. 코드를 모집책에게 전달하세요.</p>

        {result && (
          <div className={`mt-3 p-2 rounded-lg text-sm font-medium ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.message}
          </div>
        )}
      </form>

      {/* 모집책 목록 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : recruiters.length === 0 ? (
        <div className="text-center py-12 text-gray-400">등록된 모집책이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {recruiters.map((r) => (
            <div
              key={r.rowIndex}
              className={`bg-white border rounded-xl p-4 flex items-center justify-between ${r.status === 'inactive' ? 'opacity-60' : ''} ${newlyAdded === r.code ? 'ring-2 ring-yellow-400' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{r.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status === 'active' ? '활성' : '비활성'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">코드:</span>
                    <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{r.code}</code>
                    <button
                      onClick={() => copyCode(r.code)}
                      className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                    >
                      {copiedCode === r.code ? '복사됨' : '복사'}
                    </button>
                  </div>
                  {r.createdAt && (
                    <p className="text-xs text-gray-400 mt-0.5">생성: {r.createdAt}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggle(r)}
                  disabled={actionLoading === r.rowIndex}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 ${
                    r.status === 'active'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {r.status === 'active' ? '비활성화' : '활성화'}
                </button>
                <button
                  onClick={() => handleDelete(r)}
                  disabled={actionLoading === r.rowIndex}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
