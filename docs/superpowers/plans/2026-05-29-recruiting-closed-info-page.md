# 신청 마감 + 참관인 정보 페이지 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설정 시트의 `recruiting_closed` 토글로 메인을 참관인 정보 허브로 전환하고, 신청 흐름(가이드 퀴즈·`/apply`·`/api/apply`)을 차단한다.

**Architecture:** `getConfig()`가 읽는 단일 boolean 토글을 모든 소비처(메인·가이드·신청 페이지·신청 API·확인 페이지)가 분기 기준으로 사용한다. 신청 코드는 삭제하지 않고 조건부로 숨겨 토글을 끄면 현재 동작으로 복귀한다.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Google Sheets API. 테스트 러너는 없음 → 검증은 `npm run lint` + `npx tsc --noEmit`(작업별) 및 `npm run build` + 브라우저 수동 확인(최종).

**참고 스펙:** `docs/superpowers/specs/2026-05-29-recruiting-closed-info-page-design.md`

---

## 파일 구조

| 파일 | 책임 | 변경 |
|---|---|---|
| `src/lib/types.ts` | Config 타입 | 필드 2개 추가 |
| `src/lib/sheets.ts` | 실제 시트에서 Config 파싱 | 필드 2개 매핑 |
| `src/lib/sheets-mock.ts` | mock Config | 필드 2개 추가 |
| `src/app/api/apply/route.ts` | 신청 제출 API | 마감 시 410 거부 |
| `src/app/page.tsx` | 메인 | 마감 시 정보 허브 분기 |
| `src/app/guide/page.tsx` | 교육/정보 가이드 | 마감 시 정보 모드 |
| `src/app/apply/page.tsx` | 신청 폼 페이지 | 마감 시 안내 표시 |
| `src/app/check/page.tsx` | 내 신청 확인 | 마감 시 신청 링크 숨김 |

> 검증 보조: 로컬에서 mock이 활성화되려면 `GOOGLE_PRIVATE_KEY`가 비어 있어야 한다(`CLAUDE.md`). mock의 `recruiting_closed`를 `true`/`false`로 바꿔 양쪽 상태를 확인한다. 실제 시트 사용 시에는 `설정` 시트의 `recruiting_closed` 행을 `on`/빈값으로 토글한다.

---

## Task 1: Config 토글 필드 추가

토글의 기반. Config 타입에 필드를 추가하면 이를 생성하는 두 곳(`sheets.ts`, `sheets-mock.ts`)이 모두 채워져야 tsc가 통과하므로 한 작업으로 묶는다.

**Files:**
- Modify: `src/lib/types.ts` (Config 인터페이스, 현재 113–124줄)
- Modify: `src/lib/sheets.ts:96-107` (config 객체 리터럴)
- Modify: `src/lib/sheets-mock.ts:16-29` (mockConfig)

- [ ] **Step 1: 타입에 필드 추가**

`src/lib/types.ts`의 `Config` 인터페이스에서 `guide_outro: string;` 다음 줄에 추가:

```ts
  guide_outro: string;
  recruiting_closed: boolean;
  closed_notice: string;
  blocked_sigungu_public: string[];
```

- [ ] **Step 2: 실제 시트 파싱에 매핑**

`src/lib/sheets.ts`의 config 객체 리터럴(96–107줄)에서 `guide_outro` 다음에 추가:

```ts
    guide_outro: configMap.guide_outro || '',
    recruiting_closed: configMap.recruiting_closed === 'on',
    closed_notice: configMap.closed_notice || '',
    blocked_sigungu_public,
```

- [ ] **Step 3: mock에 필드 추가**

`src/lib/sheets-mock.ts`의 `mockConfig`(16–29줄)에서 `guide_outro` 다음에 추가:

```ts
  guide_outro: '이 소중한 표가 제대로 세어지려면, 우리 눈이 현장에 있어야 합니다. 여러분은 정의당이 파견한, <strong>정의당의 한 표를 지키는 파수꾼</strong>입니다.',
  recruiting_closed: true,
  closed_notice: '참관인 신청이 마감되었습니다. 배정 결과는 「내 신청 확인」에서 조회해주세요.',
  blocked_sigungu_public: [],
```

- [ ] **Step 4: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음 (Config 생성처 2곳 모두 새 필드를 채움)

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/sheets.ts src/lib/sheets-mock.ts
git commit -m "신청 마감 토글 recruiting_closed 설정 필드 추가"
```

---

## Task 2: 신청 API 서버 차단

토글을 "실제로" 작동시키는 핵심. 마감이면 직접 API 호출도 거부한다.

**Files:**
- Modify: `src/app/api/apply/route.ts` (POST 핸들러, `const config = await getConfig();` 직후 — 현재 44줄 부근)

- [ ] **Step 1: 마감 거부 분기 추가**

`src/app/api/apply/route.ts`에서 `const config = await getConfig();` 바로 다음 줄에 삽입(시군구 차단 검사보다 앞):

```ts
    // members_only 모드일 때 서버 측 당원 인증 재확인
    const config = await getConfig();

    // 신청 마감 시 거부
    if (config.recruiting_closed) {
      return NextResponse.json(
        { success: false, message: '참관인 신청이 마감되었습니다.' },
        { status: 410 },
      );
    }

    // 일반 이용자에게 차단된 시군구는 신청 거부 (관리자·모집책은 별도 엔드포인트 사용)
    if (isSigunguBlockedForPublic(parsed.data.sigungu, config.blocked_sigungu_public)) {
```

- [ ] **Step 2: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/api/apply/route.ts
git commit -m "신청 마감 시 신청 API 410 거부"
```

---

## Task 3: 메인 페이지 정보 허브

마감이면 정보 허브를 조기 반환하고, 기존(신청받는) 레이아웃은 그대로 둔다.

**Files:**
- Modify: `src/app/page.tsx` (`const config = await getConfig();`와 기존 `return (` 사이에 조기 반환 삽입)

- [ ] **Step 1: 마감 분기(정보 허브) 삽입**

`src/app/page.tsx`에서 다음 부분을:

```tsx
export default async function Home() {
  const config = await getConfig();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
```

아래로 교체(기존 `return (`부터 끝까지는 그대로 두고, 그 앞에 마감 분기만 추가):

```tsx
export default async function Home() {
  const config = await getConfig();

  if (config.recruiting_closed) {
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
            {config.closed_notice || '참관인 신청이 마감되었습니다'}
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
```

(기존 `return (` 이하 본문은 변경하지 않는다.)

- [ ] **Step 2: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "마감 시 메인을 참관인 정보 허브로 전환"
```

---

## Task 4: 가이드 정보 모드

마감이면 인증 게이트·퀴즈·신청 CTA·결격 체크박스를 제거하고 정보 6섹션만 공개한다. 가이드는 `/api/config`를 이미 fetch하므로 응답의 `recruiting_closed`로 분기한다.

**Files:**
- Modify: `src/app/guide/page.tsx` (Step2 컴포넌트 시그니처, 인증 effect, skipQuiz, 이수 배너, Step2 호출, 네비게이션 버튼)

- [ ] **Step 1: Step2에 infoMode 프롭 추가 (결격 체크박스 숨김용)**

`function Step2(...)` 시그니처와 결격 체크박스 블록을 수정. 현재:

```tsx
function Step2({ disqualifyConfirmed, onDisqualifyChange }: { disqualifyConfirmed: boolean; onDisqualifyChange: (v: boolean) => void }) {
```

교체:

```tsx
function Step2({ disqualifyConfirmed, onDisqualifyChange, infoMode = false }: { disqualifyConfirmed: boolean; onDisqualifyChange: (v: boolean) => void; infoMode?: boolean }) {
```

그리고 결격사유 확인 체크박스 `<label>` 블록(현재 90–98줄)을 `{!infoMode && ( ... )}`로 감싼다:

```tsx
        <label className="flex items-start gap-3 mt-4 pt-3 border-t border-red-200 cursor-pointer">
```

를 포함하는 `<label>...</label>` 전체를 아래로 교체:

```tsx
        {!infoMode && (
          <label className="flex items-start gap-3 mt-4 pt-3 border-t border-red-200 cursor-pointer">
            <input
              type="checkbox"
              checked={disqualifyConfirmed}
              onChange={(e) => onDisqualifyChange(e.target.checked)}
              className="mt-0.5 rounded border-red-300 text-red-500 focus:ring-red-400"
            />
            <span className="text-sm font-medium text-gray-900">위 결격사유에 해당하지 않음을 확인합니다.</span>
          </label>
        )}
```

- [ ] **Step 2: 마감 시 인증 단계 스킵**

인증 effect(현재 345–353줄)에서 조건에 `&& !data.config?.recruiting_closed`를 추가:

```tsx
        // members_only 모드면 인증 필요 여부 확인
        if (data.config?.mode === 'members_only' && !data.config?.recruiting_closed) {
          const saved = loadMemberVerification();
          if (saved) {
            setMemberVerification(saved.verification);
          } else {
            setVerificationPhase(true);
          }
        }
```

- [ ] **Step 3: closed 파생값 + skipQuiz에 반영**

`const skipQuiz = memberVerification !== null;`(현재 370줄)을 아래로 교체:

```tsx
  const closed = config?.recruiting_closed === true;
  // 당원/당원지인 인증 시 또는 마감(정보 모드) 시 퀴즈 스킵
  const skipQuiz = memberVerification !== null || closed;
```

- [ ] **Step 4: 이수 완료 배너(바로 신청하기) 숨김**

"이미 이수한 경우 바로가기" 블록(현재 457줄)의 조건 앞에 `!closed &&` 추가:

```tsx
      {!closed && quizPassed && !isQuizStep && (
```

- [ ] **Step 5: Step2 호출에 infoMode 전달**

콘텐츠 렌더링부(현재 476줄):

```tsx
      {step === 1 && <Step2 disqualifyConfirmed={disqualifyConfirmed} onDisqualifyChange={setDisqualifyConfirmed} />}
```

교체:

```tsx
      {step === 1 && <Step2 disqualifyConfirmed={disqualifyConfirmed} onDisqualifyChange={setDisqualifyConfirmed} infoMode={closed} />}
```

- [ ] **Step 6: 네비게이션 — 마감 시 결격 게이트 해제 + 마지막에 홈/바로가기**

네비게이션 블록(현재 484–518줄)을 아래로 교체:

```tsx
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            onClick={goPrev}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            이전
          </button>
        )}
        {isQuizStep ? (
          quizPassed ? (
            <button
              onClick={() => router.push('/apply')}
              className="flex-1 py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors"
            >
              참관인 신청하기
            </button>
          ) : null
        ) : isLastStep && closed ? (
          <div className="flex-1 flex flex-col gap-2">
            <Link
              href="/check"
              className="py-3 text-center bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors"
            >
              내 신청 확인
            </Link>
            <Link
              href="/report"
              className="py-3 text-center border-2 border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              참관 보고
            </Link>
            <Link
              href="/"
              className="py-3 text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              홈으로
            </Link>
          </div>
        ) : isLastStep && skipQuiz ? (
          <button
            onClick={handleGuideComplete}
            className="flex-1 py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors"
          >
            참관인 신청하기
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!closed && step === 1 && !disqualifyConfirmed}
            className="flex-1 py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            확인했습니다
          </button>
        )}
      </div>
```

- [ ] **Step 7: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음. (`Link`는 이미 import됨 — 4번 줄)

- [ ] **Step 8: Commit**

```bash
git add src/app/guide/page.tsx
git commit -m "마감 시 가이드를 정보 모드로 전환 (인증·퀴즈·신청 제거)"
```

---

## Task 5: 신청 페이지 마감 안내

`/apply`는 이미 서버 컴포넌트이므로 `getConfig()`를 직접 읽어 분기한다.

**Files:**
- Modify: `src/app/apply/page.tsx` (전체)

- [ ] **Step 1: 마감 분기 추가 (전체 교체)**

`src/app/apply/page.tsx` 전체를 아래로 교체:

```tsx
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
```

- [ ] **Step 2: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/apply/page.tsx
git commit -m "마감 시 신청 페이지에 마감 안내 표시"
```

---

## Task 6: 신청 확인 페이지 — 신청 링크 숨김

마감 시 조회 결과가 없을 때 뜨던 `/apply` 링크를 숨긴다.

**Files:**
- Modify: `src/app/check/page.tsx` (`CheckContent` 컴포넌트 상태/effect, 결과 없음 블록 211–221줄)

- [ ] **Step 1: 마감 상태 fetch**

`CheckContent` 안의 상태 선언부(현재 48줄 `const [searched, setSearched] = useState(false);` 다음)에 추가:

```tsx
  const [searched, setSearched] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => setClosed(!!d.config?.recruiting_closed))
      .catch(() => {});
  }, []);
```

- [ ] **Step 2: 결과 없음 블록에서 신청 링크 조건부 처리**

결과 없음 블록(현재 211–221줄)을 아래로 교체:

```tsx
        {searched && results && results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">{message || '신청 내역이 없습니다.'}</p>
            {!closed && (
              <Link
                href="/apply"
                className="inline-block mt-4 px-6 py-2 bg-yellow-400 text-gray-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors"
              >
                참관인 신청하기
              </Link>
            )}
          </div>
        )}
```

- [ ] **Step 3: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음. (`useEffect`, `Link`는 이미 import됨)

- [ ] **Step 4: Commit**

```bash
git add src/app/check/page.tsx
git commit -m "마감 시 신청 확인 페이지의 신청 링크 숨김"
```

---

## Task 7: 전체 빌드 + 브라우저 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 프로덕션 빌드**

Run: `npm run build`
Expected: 성공 (타입·린트 에러 없음)

- [ ] **Step 2: 마감 ON 상태 브라우저 확인**

`src/lib/sheets-mock.ts`의 `recruiting_closed: true`(기본) 상태로 `npm run dev` 후 확인:
- `/` → 정보 허브: 마감 배너(closed_notice 문구), "참관인 안내" 카드 + 자세히 보기, [내 신청 확인]·[참관 보고], 관리자. **신청하기 버튼 없음**
- `/guide` → 인증/퀴즈 없이 1~6 섹션 표시. Step2에 결격 체크박스 없음. 마지막 섹션에 [내 신청 확인]·[참관 보고]·[홈으로]. **신청하기 CTA 없음**
- `/apply` → "참관인 신청이 마감되었습니다" 안내 + 링크 (폼 없음)
- `/check` → 임의 이름/연락처로 조회해 결과 없을 때 신청 링크가 **안 보임**
- `/report` → 정상 동작(변경 없음)

- [ ] **Step 3: 마감 OFF 상태 회귀 확인**

`src/lib/sheets-mock.ts`에서 `recruiting_closed: false`로 임시 변경 후 `npm run dev`:
- `/` → 기존 레이아웃(참관인 신청하기 버튼 노출)
- `/guide` → 기존 흐름(인증/퀴즈/신청 CTA) 동작
- `/apply` → 신청 폼 표시
- `/check` → 결과 없을 때 신청 링크 노출

확인 후 `recruiting_closed: true`로 되돌린다.

- [ ] **Step 4: (변경 없음 확인) Commit 불필요**

mock 값을 `true`로 되돌렸으면 추가 변경 없음. 회귀 확인 중 임시 변경만 했으므로 `git status`가 깨끗한지 확인:

Run: `git status --short`
Expected: 변경 없음 (mock은 `true`로 복원됨)

---

## Self-Review (작성자 점검 결과)

- **스펙 커버리지:** A(Config)=Task1, D(API 차단)=Task2, B(메인)=Task3, C(가이드 정보 모드)=Task4, D(/apply 안내)=Task5, E(/check)=Task6, F(명칭 유지)=레이아웃에 반영, 검증=Task7. 누락 없음.
- **플레이스홀더:** 없음. 모든 코드 단계에 실제 코드 포함.
- **타입 일관성:** `recruiting_closed: boolean`, `closed_notice: string`을 Task1에서 정의하고 이후 모든 참조가 동일 명칭 사용. 가이드의 `closed` 파생값과 Step2 `infoMode` 프롭명 일관.
