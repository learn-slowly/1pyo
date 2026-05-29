# 신청 마감 + 참관인 정보 페이지 개편 설계

작성일: 2026-05-29

## 배경 / 목적

2026 지방선거(6월 3일)를 앞두고 투표소 배정이 끝나, 더 이상 참관인 신청을 받지 않는다.
메인 페이지를 "신청 받는 랜딩"에서 "이미 선정된 참관인을 위한 정보 페이지"로 전환한다.

남길 요소:
- 메인 = 참관인을 위한 정보 페이지
- 내 신청 확인 버튼
- 참관 보고 버튼
- 관리자 버튼

## 핵심 접근

설정 시트의 **`recruiting_closed` 토글 하나**로 전체 동작을 전환한다.

- 켜짐(`on`): 메인 = 정보 허브, 신청 흐름(가이드 퀴즈·`/apply`·`/api/apply`) 차단
- 꺼짐(기본): 현재(신청받는) 동작 그대로

신청 관련 코드·로직을 삭제하지 않으므로, 다음 선거나 노동당 포크에서 시트 값만 바꿔 재사용한다.
CLAUDE.md의 "하드코딩 제거, 지역별 콘텐츠는 시트로 관리" 원칙과 일관된다.

## 컴포넌트별 설계

### A. 설정(Config)

`설정` 시트(A:B)에 키 추가:

| 키 | 값 | 의미 |
|---|---|---|
| `recruiting_closed` | `on` | 신청 마감 여부 (그 외/빈 값이면 미마감) |
| `closed_notice` | 자유 문구 | 마감 안내 배너 문구 (선택) |

코드 반영:
- `Config` 타입(`src/lib/types.ts`)에 `recruiting_closed: boolean`, `closed_notice: string` 추가
- `getConfig()`(`src/lib/sheets.ts`): `recruiting_closed: configMap.recruiting_closed === 'on'`, `closed_notice: configMap.closed_notice || ''` — 기존 `lottery_mode === 'on'` 패턴 그대로
- mock(`src/lib/sheets-mock.ts`): 두 필드 추가 (개발 시 마감 상태 확인용으로 `recruiting_closed: true` 기본값 권장)
- `/api/config`(`src/app/api/config/route.ts`): password만 제외하고 전달하므로 두 필드는 자동 노출됨 (별도 작업 불필요)

`closed_notice` 기본 문구(시트가 비었을 때): **"참관인 신청이 마감되었습니다"**

### B. 메인 페이지 `/` (`src/app/page.tsx`, 서버 컴포넌트)

`getConfig()` 결과의 `recruiting_closed`로 분기.

**마감 시 → 정보 허브 레이아웃**
- 로고 + 제목("2026 지방선거 참관 안내")
- 마감 안내 배너: `config.closed_notice || '참관인 신청이 마감되었습니다'`
- 참관 핵심 요약 카드: "투표/개표 참관인 역할", "당일 타임라인", "준비물·수당·연락처" 항목 + `[자세히 보기 →]` → `/guide`
- `[내 신청 확인]` → `/check`
- `[참관 보고]` → `/report`
- 문의 연락처(`config.contacts`, `config.contact_notice`)
- `관리자`(작은 링크) → `/admin`

**미마감 시 → 현재 레이아웃 유지** (참관인 신청하기 버튼 노출)

### C. 가이드 `/guide` (`src/app/guide/page.tsx`, 클라이언트 컴포넌트) — 정보 모드

가이드는 `/api/config`를 이미 fetch한다. 응답의 `recruiting_closed`로 분기.

**마감 시 (정보 모드):**
- 당원 인증 단계(`verificationPhase`) 진입 안 함 → 누구나 열람
- 퀴즈 스텝 제외 (`STEP_TITLES`에서 '퀴즈' 제거된 흐름)
- 신청 CTA 제거: "참관인 신청하기" 버튼, "바로 신청하기" 바로가기, "교육을 이수하셨습니다" 녹색 배너 모두 숨김
- Step2(참관인이 될 수 없는 사람): 결격사유 **정보 목록은 유지**, 신청용 확인 체크박스 및 "확인했습니다" 버튼의 `disqualifyConfirmed` 게이트 제거
- 마지막 스텝 하단: `[홈으로]` + `[내 신청 확인]`·`[참관 보고]` 바로가기

**미마감 시:** 현재 흐름(인증→교육→퀴즈→신청) 그대로

> 별도 페이지를 새로 만들지 않고 기존 컴포넌트에 조건부 렌더링으로 처리한다. 한 컴포넌트가 두 모드를 갖지만 마감 분기가 명확히 갈린다.

### D. 신청 차단

- `/api/apply`(`src/app/api/apply/route.ts`) POST: `const config = await getConfig();` 직후, `config.recruiting_closed`면 거부 — `{ success: false, message: '참관인 신청이 마감되었습니다.' }`, status 410. 직접 API 호출도 막아 토글을 실제로 작동시킨다.
- `/apply`(`src/app/apply/page.tsx`): 이미 서버 컴포넌트이므로 `getConfig()`를 직접 읽어 분기. 마감이면 `<ApplyForm />` 대신 마감 안내 표시 — "참관인 신청이 마감되었습니다" + `[내 신청 확인]`·`[참관인 정보 보기]` 링크. 미마감이면 현재대로 `<ApplyForm />`.

### E. 신청 확인 `/check` (`src/app/check/page.tsx`, 클라이언트 컴포넌트)

- 조회 결과가 없을 때 표시되던 `참관인 신청하기` → `/apply` 링크(현재 214–219줄)를 `recruiting_closed`일 때 숨김. 미마감 시 유지.
- 마감 상태는 `/api/config`로 확인.

### F. 명칭

버튼 라벨은 기존대로 유지: **`내 신청 확인`**, **`참관 보고`**, **`관리자`**.

## 동작 흐름 요약

```
설정시트 recruiting_closed = on
  │
  ├─ /            → 정보 허브 (요약 + 자세히보기 + 내신청확인 + 참관보고 + 관리자)
  ├─ /guide       → 정보 모드 (인증·퀴즈·신청 제거, 정보 6섹션 공개)
  ├─ /apply       → 마감 안내 (폼 차단)
  ├─ /api/apply   → 410 거부
  └─ /check       → 신청하기 링크 숨김

설정시트 recruiting_closed 비어있음 (기본)
  └─ 전부 현재(신청받는) 동작 그대로
```

## 범위 밖 (이번 작업 안 함)

- 신청 관련 코드/컴포넌트(`ApplyForm` 등) 삭제 — 토글로 보존
- 관리자/모집책 페이지 변경
- 보고(`/report`)·확인(`/check`) 폼 내부 로직 변경 (링크/노출만 조정)
- 명칭 변경(내 신청 확인 → 내 배정 확인 등)

## 검증 방법

- 로컬: mock `recruiting_closed: true`로 메인/가이드/apply/check 마감 동작 확인, `false`로 기존 동작 회귀 확인
- `npm run build`, `npm run lint` 통과
- 브라우저에서 마감 ON/OFF 양쪽 골든 패스 확인
