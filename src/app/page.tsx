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
            href="/guide"
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

        <div className="text-xs text-gray-400 space-y-1">
          <p>문의: 010-5960-5190 (문자만 가능, 전화 연결 시 신청 반려)</p>
          <p>진주지역: 010-5168-2404 (문자만 가능)</p>
        </div>

        <Link href="/admin" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
          관리자
        </Link>
      </div>
    </main>
  );
}
