'use client';

import Link from 'next/link';
import QuizStep from '@/components/QuizStep';

export default function QuizPreviewPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 홈으로</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">참관인 퀴즈 미리보기</h1>
        <p className="text-sm text-gray-500 mt-1">검수용 — 실제 신청 흐름과 무관</p>
      </div>

      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
        이 페이지는 퀴즈 문항·동작 확인용입니다. 만점 통과해도 신청 페이지로 이동하지 않습니다.
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-yellow-400">
        퀴즈
      </h2>

      <QuizStep onPass={() => {}} />
    </div>
  );
}
