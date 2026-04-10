import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { z } from 'zod';

const uploadSchema = z.object({
  type: z.enum(['early', 'polling', 'counting']),
});

// Google Sheets 클라이언트
async function getSheetsClient() {
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID is not set');
  return id;
}

interface ParsedRow {
  [key: string]: string;
}

// 선관위 통계시스템 포맷 감지
// 1행: 중앙선거관리위원회 선거통계시스템
// 2행: [제21대 대통령선거] 선거일투표소 현황
// 3행: [경상남도][진주시]
// 4행: 날짜
// 5행: 헤더 (투표소명, 건물명(층), 투표소 주소, 장애인 편의시설)
// 6행~: 데이터
function isNecFormat(rows: string[][]): boolean {
  if (rows.length < 6) return false;
  const first = String(rows[0]?.[0] ?? '').trim();
  return first.includes('선거관리위원회') || first.includes('선거통계');
}

function extractSigungu(rows: string[][]): string {
  // 3행에서 [시도][시군구] 추출
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const cell = String(rows[i]?.[0] ?? '').trim();
    const match = cell.match(/\[([^\]]+)\]\[([^\]]+)\]/);
    if (match) return match[2]; // 시군구 부분
  }
  return '';
}

function parseExcel(buffer: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

  if (rows.length < 2) return [];

  if (isNecFormat(rows)) {
    // 선관위 포맷
    const sigungu = extractSigungu(rows);

    // 헤더 행 찾기 (투표소명, 개표소명, 구시군명 등이 포함된 행)
    let headerIdx = -1;
    const headerKeywords = ['투표소명', '사전투표소명', '개표소명', '구시군명'];
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      if (rows[i].some(cell => headerKeywords.some(kw => String(cell).trim().includes(kw)))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return [];

    const headers = rows[headerIdx].map(h => String(h).trim());
    return rows.slice(headerIdx + 1)
      .filter(row => row.some(cell => String(cell).trim() !== ''))
      .map(row => {
        const obj: ParsedRow = { __sigungu: sigungu };
        headers.forEach((h, i) => {
          obj[h] = String(row[i] ?? '').trim();
        });
        return obj;
      });
  }

  // 일반 포맷: 첫 행을 헤더로
  const headers = rows[0].map(h => String(h).trim());
  return rows.slice(1)
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => {
      const obj: ParsedRow = {};
      headers.forEach((h, i) => {
        obj[h] = String(row[i] ?? '').trim();
      });
      return obj;
    });
}

// 엑셀 컬럼명 → 시트 컬럼명 매핑 (유연하게 매칭)
function findColumn(row: ParsedRow, candidates: string[]): string {
  for (const c of candidates) {
    // 정확히 일치
    if (row[c] !== undefined) return row[c];
    // 포함 매칭
    const key = Object.keys(row).find(k => k.includes(c));
    if (key) return row[key];
  }
  return '';
}

// 투표소명에서 읍면동 추출 (예: "문산읍제1투" → "문산읍", "상봉동제2투" → "상봉동")
function extractDong(stationName: string): string {
  const match = stationName.match(/^(.+?[읍면동가리])/);
  return match ? match[1] : '';
}

function mapPollingRows(rows: ParsedRow[]): string[][] {
  return rows.map((row, i) => {
    const id = `PS-${String(i + 1).padStart(3, '0')}`;
    const sigungu = row.__sigungu || findColumn(row, ['시군구', '구시군', '시·군·구']);
    const electorate = findColumn(row, ['선거구', '선거구명']);
    const stationName = findColumn(row, ['투표소명', '투표소', '장소명']);
    const buildingName = findColumn(row, ['건물명(층)', '건물명', '설치장소']);
    const address = findColumn(row, ['주소', '소재지', '위치', '투표소 주소']);
    return [id, sigungu, electorate, stationName, buildingName, address, '0', '0', '1', '1'];
  });
}

function mapEarlyRows(rows: ParsedRow[]): string[][] {
  return rows.map((row, i) => {
    const id = `ES-${String(i + 1).padStart(3, '0')}`;
    const sigungu = row.__sigungu || findColumn(row, ['시군구', '구시군', '구시군명', '시·군·구']);
    const stationName = findColumn(row, ['사전투표소명', '투표소명', '투표소', '장소명']);
    const dong = findColumn(row, ['읍면동명', '읍면동', '동', '읍·면·동']) || extractDong(stationName);
    const buildingName = findColumn(row, ['설치장소(건물명)', '설치장소', '건물명(층)', '건물명']);
    const address = findColumn(row, ['소재지', '주소', '위치', '투표소 주소']);
    return [id, sigungu, dong, stationName, buildingName, address, '0', '0', '0', '0', '1'];
  });
}

function mapCountingRows(rows: ParsedRow[]): string[][] {
  return rows.map((row, i) => {
    const id = `CS-${String(i + 1).padStart(3, '0')}`;
    const sigungu = findColumn(row, ['구시군명', '시군구', '구시군', '시·군·구']) || row.__sigungu || '';
    const stationName = findColumn(row, ['개표소명', '개표소', '장소명', '투표소명']);
    const buildingName = findColumn(row, ['건물명', '설치장소', '건물명(층)']);
    const floor = findColumn(row, ['층']);
    const buildingFull = floor ? `${buildingName}(${floor})` : buildingName;
    const address = findColumn(row, ['소재지', '주소', '위치', '투표소 주소']);
    return [id, sigungu, stationName, buildingFull, address, '0', '6'];
  });
}

const APPLICANT_SHEET_NAMES: Record<string, string> = {
  polling: '본투표참관신청자',
  early: '사전투표참관신청자',
  counting: '개표참관신청자',
};

function getSheetInfo(type: 'early' | 'polling' | 'counting') {
  switch (type) {
    case 'polling':
      return {
        sheetName: '본투표소',
        applicantSheetName: APPLICANT_SHEET_NAMES.polling,
        headers: ['id', 'sigungu', 'electorate', 'station_name', 'building_name', 'address', 'am_count', 'pm_count', 'am_max', 'pm_max'],
        mapFn: mapPollingRows,
        prefix: 'PS',
      };
    case 'early':
      return {
        sheetName: '사전투표소',
        applicantSheetName: APPLICANT_SHEET_NAMES.early,
        headers: ['id', 'sigungu', 'dong', 'station_name', 'building_name', 'address', 'd1_am_count', 'd1_pm_count', 'd2_am_count', 'd2_pm_count', 'slot_max'],
        mapFn: mapEarlyRows,
        prefix: 'ES',
      };
    case 'counting':
      return {
        sheetName: '개표소',
        applicantSheetName: APPLICANT_SHEET_NAMES.counting,
        headers: ['id', 'sigungu', 'station_name', 'building_name', 'address', 'current_count', 'max_count'],
        mapFn: mapCountingRows,
        prefix: 'CS',
      };
  }
}

// 투표소 데이터에서 신청자 템플릿 행 생성
function generateApplicantTemplateRows(
  type: 'early' | 'polling' | 'counting',
  stationRows: string[][],
): string[][] {
  const templateRows: string[][] = [];

  stationRows.forEach((row, idx) => {
    const serialNo = String(idx + 1);
    const stationId = row[0];

    switch (type) {
      case 'polling': {
        // [id, sigungu, electorate, station_name, building_name, address, ...]
        const stationName = row[3];
        const sigungu = row[1];
        templateRows.push(
          [serialNo, '1', '1', '', '', '', '', '', '', '', '', '', '', '', '', stationId, 'am', stationName, sigungu, '', '', ''],
          [serialNo, '2', '2', '', '', '', '', '', '', '', '', '', '', '', '', stationId, 'pm', stationName, sigungu, '', '', ''],
        );
        break;
      }
      case 'early': {
        // [id, sigungu, dong, station_name, building_name, address, ...]
        const stationName = row[3];
        const sigungu = row[1];
        templateRows.push(
          [serialNo, '1', '1', '', '', '', '', '', '', '', '', '', '', '', '', stationId, 'd1_am', stationName, sigungu, '', '', ''],
          [serialNo, '1', '2', '', '', '', '', '', '', '', '', '', '', '', '', stationId, 'd1_pm', stationName, sigungu, '', '', ''],
          [serialNo, '1', '1', '', '', '', '', '', '', '', '', '', '', '', '', stationId, 'd2_am', stationName, sigungu, '', '', ''],
          [serialNo, '1', '2', '', '', '', '', '', '', '', '', '', '', '', '', stationId, 'd2_pm', stationName, sigungu, '', '', ''],
        );
        break;
      }
      case 'counting': {
        // [id, sigungu, station_name, building_name, address, ...]
        const stationName = row[2];
        const sigungu = row[1];
        for (let rank = 1; rank <= 6; rank++) {
          templateRows.push(
            [serialNo, String(rank), '3', '', '', '', '', '', '', '', '', '', '', '', '', stationId, 'all', stationName, sigungu, '', '', ''],
          );
        }
        break;
      }
    }
  });

  return templateRows;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const type = formData.get('type') as string;
    const mode = formData.get('mode') as string || 'replace';

    if (files.length === 0) {
      return NextResponse.json({ error: '파일을 선택해주세요.' }, { status: 400 });
    }

    const parsed = uploadSchema.safeParse({ type });
    if (!parsed.success) {
      return NextResponse.json({ error: '참관 유형을 선택해주세요.' }, { status: 400 });
    }

    // 모든 파일 파싱 후 병합
    const allRows: ParsedRow[] = [];
    const fileResults: { name: string; rows: number }[] = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const rows = parseExcel(buffer);
      fileResults.push({ name: file.name, rows: rows.length });
      allRows.push(...rows);
    }

    if (allRows.length === 0) {
      return NextResponse.json({ error: '데이터가 없습니다. 엑셀 파일을 확인해주세요.' }, { status: 400 });
    }

    const { sheetName, headers, mapFn } = getSheetInfo(parsed.data.type);
    const mappedRows = mapFn(allRows);

    // 미리보기 반환
    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        preview: true,
        headers,
        rows: mappedRows.slice(0, 10),
        totalRows: mappedRows.length,
        fileResults,
      });
    }

    // Google Sheets에 기록
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const { applicantSheetName } = getSheetInfo(parsed.data.type);

    if (mode === 'replace') {
      // 투표소 시트 + 신청자 시트 동시 클리어
      await Promise.all([
        sheets.spreadsheets.values.clear({ spreadsheetId, range: `${sheetName}!A2:Z` }),
        sheets.spreadsheets.values.clear({ spreadsheetId, range: `${applicantSheetName}!A2:Z` }),
      ]);
    }

    // 투표소 데이터 기록
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: { values: mappedRows },
    });

    // 신청자 템플릿 행 생성
    const templateRows = generateApplicantTemplateRows(parsed.data.type, mappedRows);
    if (templateRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${applicantSheetName}!A:V`,
        valueInputOption: 'RAW',
        requestBody: { values: templateRows },
      });
    }

    const slotCount = parsed.data.type === 'polling' ? 2 : parsed.data.type === 'early' ? 4 : 6;

    return NextResponse.json({
      success: true,
      message: `${files.length}개 파일에서 총 ${mappedRows.length}개 투표소 (${templateRows.length}개 참관인 슬롯)가 등록되었습니다.`,
      count: mappedRows.length,
      slots: templateRows.length,
      fileResults,
    });
  } catch (error) {
    console.error('upload API error:', error);
    return NextResponse.json(
      { error: '파일 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
