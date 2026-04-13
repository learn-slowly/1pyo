import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">2026한표</h1>
          <p className="text-gray-500 mt-2">한 표의 정의를 지키는, 정의당의 한 표 지킴이</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/apply"
            className="block w-full py-4 bg-yellow-400 text-gray-900 font-bold text-lg rounded-xl hover:bg-yellow-500 transition-colors"
          >
            참관인 신청하기
          </Link>

          <Link
            href="/check"
            className="block w-full py-4 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            내 신청 확인
          </Link>

          <Link
            href="/report"
            className="block w-full py-4 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            참관 보고
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          제9회 전국동시지방선거 · 2026년 6월 3일
        </p>
      </div>
    </main>
  );
}
