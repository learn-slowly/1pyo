# 멀티테넌트 전국 확장 계획

## 현재 상태 (2026-04-14 기준)

하드코딩 제거 완료:
- 설정 시트에 `region_name`, `contact_*`, `guide_intro`, `guide_outro` 키 추가됨
- 후보정보 시트 탭 신설 (title, description, detail_label, detail_content)
- 메인 페이지(서버), 교육자료(클라이언트), 신청폼 모두 동적 데이터로 전환
- `/api/config` 엔드포인트 생성 (config + 후보정보 반환)
- `scripts/seed-config.mjs` — 새 지역 시트 초기 데이터 투입용 스크립트 보존

## 다음 단계: 멀티테넌트 (미착수)

### 구조
- URL 경로 방식: `1pyo.kr/gyeongnam/guide`, `1pyo.kr/seoul/apply` 등
- 중앙 설정 시트 1개 (지역 목록 + 각 지역 스프레드시트 ID 매핑)
- 지역별 Google Sheets는 독립 (기존 시트 구조 그대로 복제)

### 필요 작업
1. **중앙 설정 시트** 생성 — 지역 slug, 지역명, 스프레드시트 ID 매핑 테이블
2. **라우팅 변경** — `/[region]/guide`, `/[region]/apply` 등 동적 라우트
3. **sheets.ts 수정** — `getSpreadsheetId()`를 region slug 기반으로 동적 조회
4. **관리자 권한 분리** — 지역별 관리자 계정 (JWT에 region claim 추가)
5. **메인 페이지** — 지역 선택 화면 or 자동 감지
6. **환경변수** — `GOOGLE_SPREADSHEET_ID`를 중앙 설정 시트 ID로 전환, 지역별 시트 ID는 중앙 시트에서 관리

### 새 지역 추가 흐름
1. 기존 시트 복제 (빈 템플릿)
2. 설정 시트 + 후보정보 탭 지역에 맞게 입력
3. 중앙 설정 시트에 slug + 스프레드시트 ID 한 줄 추가
4. 관리자 계정 발급
5. 관리자가 선관위 엑셀 업로드 → 투표소 생성
6. 신청 접수 시작

### 고려사항
- Google Sheets API 쿼터: 지역별 시트 분리로 자연 분산됨
- 교육 내용(Step2~6, 퀴즈)은 전국 공통 — 변경 불필요
- 사전투표 확정일 등 전국 공통 일정도 변경 불필요
