import ApplyForm from '@/components/apply/ApplyForm';
import Link from 'next/link';
import { getConfig } from '@/lib/sheets';

export const metadata = {
  title: '참관인 신청 - 2026한표',
  description: '정의당 투개표 참관인 신청',
};

export default async function ApplyPage() {
  const config = await getConfig();

  if (config.recruiting_closed) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">참관인 신청이 마감되었습니다</h1>
          <p className="text-gray-500">{config.closed_notice || '더 이상 신청을 받지 않습니다.'}</p>
          <div className="space-y-3">
            <Link
              href="/check"
              className="block w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors"
            >
              내 신청 확인
            </Link>
            <Link
              href="/guide"
              className="block w-full py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              참관인 정보 보기
            </Link>
            <Link href="/" className="inline-block text-sm text-gray-400 hover:text-gray-600 transition-colors">
              홈으로
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <ApplyForm />
    </main>
  );
}
