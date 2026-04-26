# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Framework constraint (carry-forward rule)
- This project uses Next.js `16.2.2` (not older App Router assumptions). Before making framework-level changes, read the relevant docs in `node_modules/next/dist/docs/` and follow deprecation notices.

## Core development commands
- Install deps: `npm install`
- Start dev server: `npm run dev`
- Production build: `npm run build`
- Start production server: `npm run start`
- Lint: `npm run lint`

## Test status
- There is currently no test runner or `npm test` script configured in `package.json`.
- There is also no existing single-test command in this repository right now.

## Environment and runtime behavior
- Main persistence is Google Sheets via service account auth in `src/lib/sheets.ts`.
- Required env vars for live Sheets mode:
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_PRIVATE_KEY` (with `\n`-escaped newlines in `.env.local`)
  - `GOOGLE_SPREADSHEET_ID`
- If `GOOGLE_PRIVATE_KEY` is missing, the app automatically switches to mock data (`src/lib/sheets-mock.ts`).
- Admin/session-related env vars:
  - `ADMIN_JWT_SECRET` (falls back to an insecure default if unset; set this in non-local environments)
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` for alerting + webhook command handling

## High-level architecture
- Next.js App Router app under `src/app`.
  - Public flows: `/` (entry), `/apply` (application wizard), `/check` (application lookup), `/report` (voter count & incident reporting)
  - Admin flows: `/admin` login, `/admin/dashboard`, `/admin/register`, `/admin/upload`
- API routes are colocated in `src/app/api/**/route.ts` and act as a thin validation/controller layer (mostly Zod + calls into `src/lib/*`).
- Business/data access logic is centralized in `src/lib/sheets.ts`:
  - Reads/writes station, applicant, report, and blacklist data in Google Sheets
  - Enforces duplicate/day-group/cross-type constraints for applications
  - Updates seat counts by reading and writing sheet cells
  - Maintains a short in-memory station/config cache (30s TTL)
- `src/lib/sheets-mock.ts` mirrors Sheets behavior for local/dev fallback when credentials are absent.
- Admin auth:
  - Token creation/verification in `src/lib/auth.ts`
  - Route protection in `src/middleware.ts` for `/admin/:path+` and `/api/admin/:path+` (except login)

## Data model and sheet coupling
- The app is tightly coupled to named Google Sheet tabs and column positions.
- Key tabs referenced in code include:
  - Config/station sheets: `설정`, `본투표소`, `사전투표소`, `개표소`
  - Applicant sheets: `본투표참관신청자`, `사전투표참관신청자`, `개표참관신청자`
  - Reporting/ops sheets: `투표인수보고`, `특이사항보고`, `블랙리스트`
- Be careful when changing column order or tab names; many handlers depend on fixed column indices.

## Key flows worth understanding before edits
- Application flow:
  1) Client wizard in `src/components/apply/ApplyForm.tsx` loads stations via `/api/stations`
  2) Submit goes to `/api/apply`
  3) API delegates to `submitApplication()` in `src/lib/sheets.ts` for validation + write + seat update
- Admin dashboard flow:
  - `/api/admin/applicants` aggregates rows across all applicant tabs, computes stats, supports status updates/deletion, and synchronizes seat counters.
- Upload flow:
  - Admin upload UI sends files to `/api/upload`
  - Route parses NEC/general Excel formats via `xlsx`, maps rows into station schema, optionally clears old data, writes station rows, then generates applicant template slots.

## Type and import conventions
- TypeScript is strict-mode enabled (`tsconfig.json`).
- Path alias is configured as `@/* -> src/*`; use existing alias style for imports.
