'use client';

import { useState, useRef, useCallback } from 'react';
import type { ObservationType } from '@/lib/types';

const TYPE_LABELS: Record<ObservationType, string> = {
  early: '사전투표소',
  polling: '본투표소',
  counting: '개표소',
};

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  fileResults: { name: string; rows: number }[];
}

export default function UploadPage() {
  const [type, setType] = useState<ObservationType | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(async (newFiles: File[]) => {
    if (!type) return;
    const merged = [...files, ...newFiles];
    setFiles(merged);
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    merged.forEach(f => formData.append('files', f));
    formData.append('type', type);
    formData.append('mode', 'preview');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setPreview(data);
      } else {
        setResult({ message: data.error, success: false });
      }
    } catch {
      setResult({ message: '파일 처리 중 오류가 발생했습니다.', success: false });
    } finally {
      setLoading(false);
    }
  }, [type, files]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) handleFiles(droppedFiles);
  }, [handleFiles]);

  const removeFile = useCallback(async (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);

    if (newFiles.length === 0) {
      setPreview(null);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    newFiles.forEach(f => formData.append('files', f));
    formData.append('type', type!);
    formData.append('mode', 'preview');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) setPreview(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [files, type]);

  const handleSubmit = async () => {
    if (files.length === 0 || !type) return;
    setLoading(true);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('type', type);
    formData.append('mode', 'replace');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setResult({ message: data.message || data.error, success: data.success });
      if (data.success) {
        setPreview(null);
        setFiles([]);
      }
    } catch {
      setResult({ message: '업로드 중 오류가 발생했습니다.', success: false });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">투표소 데이터 업로드</h1>
        <p className="text-gray-500 mb-8">선관위 엑셀 파일을 업로드하면 자동으로 투표소 데이터가 등록됩니다.</p>

        {/* Step 1: 유형 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">1. 참관 유형 선택</label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(TYPE_LABELS) as [ObservationType, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setType(key); reset(); }}
                className={`py-3 rounded-lg border-2 font-medium transition-colors ${
                  type === key
                    ? 'border-yellow-400 bg-yellow-50 text-gray-900'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: 파일 업로드 */}
        {type && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">2. 엑셀 파일 업로드 (여러 파일 가능)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-yellow-400 bg-yellow-50'
                  : files.length > 0
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {files.length > 0 ? (
                <p className="text-gray-500">추가 파일을 드래그하거나 클릭하여 선택</p>
              ) : (
                <div>
                  <p className="text-gray-500">엑셀 파일을 드래그하거나 클릭하여 선택</p>
                  <p className="text-sm text-gray-400 mt-1">.xlsx, .xls, .csv 지원 / 여러 파일 동시 선택 가능</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  if (selected.length > 0) handleFiles(selected);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              />
            </div>

            {/* 파일 목록 */}
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between bg-white border rounded-lg px-4 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400">
                        {(f.size / 1024).toFixed(1)} KB
                        {preview?.fileResults[i] && ` · ${preview.fileResults[i].rows}행`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="ml-3 text-gray-400 hover:text-red-500 text-lg shrink-0"
                      title="삭제"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block h-6 w-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 mt-2">처리 중...</p>
          </div>
        )}

        {/* 미리보기 */}
        {preview && !loading && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              3. 미리보기 (총 {preview.totalRows}개 투표소, {files.length}개 파일 병합)
            </label>
            <div className="overflow-x-auto border rounded-lg bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {preview.headers.map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 whitespace-nowrap text-gray-700">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.totalRows > 10 && (
              <p className="text-xs text-gray-400 mt-1 text-right">
                ...외 {preview.totalRows - 10}개
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
              >
                {TYPE_LABELS[type!]}에 등록하기
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="font-medium">{result.message}</p>
            {result.success && (
              <button
                onClick={() => { reset(); setResult(null); }}
                className="mt-2 text-sm underline"
              >
                추가 업로드
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
