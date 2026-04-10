# 2026한표정의 (1pyo)

## Project Overview
Korean election observer (참관인) recruitment platform for 정의당 (Justice Party).
Manages observer applications for early voting, election day polling, and vote counting.

## Tech Stack
- Next.js 14+ (App Router) with TypeScript
- Tailwind CSS with 정의당 yellow (#FFCC00) accent
- Google Sheets API v4 as database (service account auth)
- Deployed on Vercel

## Development
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint

## Environment Variables
Copy `.env.example` to `.env.local` and fill in:
- GOOGLE_SERVICE_ACCOUNT_EMAIL - Service account email
- GOOGLE_PRIVATE_KEY - Service account private key (with \n literals)
- GOOGLE_SPREADSHEET_ID - Target spreadsheet ID

When GOOGLE_PRIVATE_KEY is not set, mock data is used automatically.

## Key Architecture Decisions
- Google Sheets is the single source of truth (no separate DB)
- Station data cached server-side with 30s TTL
- Mock data layer (`sheets-mock.ts`) used when Google credentials not set
- Seat count updates use read-then-write on specific cells (as atomic as Sheets allows)
- Phone numbers normalized for duplicate checking

## Data Model
See prd.md Section 5 for full Google Sheets schema.
Key sheets: 설정, 본투표소, 사전투표소, 개표소, 신청자

## Korean Terminology
- 참관인 = election observer
- 사전투표 = early voting (type: 'early')
- 본투표 = election day voting (type: 'polling')
- 개표 = vote counting (type: 'counting')
- 시군구 = city/county/district
- 투표소 = polling station
- 잔여석 = remaining seats
- 추첨 = lottery
- 당원 = party member
