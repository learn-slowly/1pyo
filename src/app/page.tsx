import Image from "next/image";
import Link from "next/link";
import { getConfig } from "@/lib/sheets";

export default async function Home() {
  const config = await getConfig();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <Image
            src="/top_logo_main1.png"
            alt="정의당"
            width={174}
            height={65}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-2xl font-bold text-gray-900">2026 지방선거 참관 안내</h1>
          <p className="text-gray-500 mt-2">한 표의 정의를 지키는, 정의당의 한 표 지킴이</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700">
          <p className="font-bold text-gray-900">참관인 모집은 전부 마감되었습니다.</p>
          <p className="mt-1">참관인 선정 결과는 6/1-2에 해당 읍면동에서 연락이 옵니다.</p>
        </div>

        <Link
          href="/guide"
          className="block w-full text-left bg-white border-2 border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
        >
          <p className="font-bold text-gray-900">참관인 안내</p>
          <ul className="text-sm text-gray-500 mt-2 space-y-0.5">
            <li>· 투표/개표 참관인 역할</li>
            <li>· 당일 타임라인</li>
            <li>· 준비물·수당·연락처</li>
          </ul>
          <span className="inline-block mt-3 text-sm font-bold text-yellow-600">자세히 보기 →</span>
        </Link>

        <div className="space-y-3">
          <Link
            href="/check"
            className="block w-full py-4 bg-yellow-400 text-gray-900 font-bold text-lg rounded-xl hover:bg-yellow-500 transition-colors"
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
          {config.contacts.map((c, i) => (
            <p key={i}>{c.label}: {c.number} (문자만 가능)</p>
          ))}
          {config.contact_notice && (
            <p className="mt-1">* {config.contact_notice}</p>
          )}
        </div>

        <Link href="/admin" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
          관리자
        </Link>
      </div>
    </main>
  );
}
