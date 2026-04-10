import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const checkSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
});

async function getSheetsClient() {
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

const SHEETS = [
  { name: '본투표참관신청자', type: '본투표 참관', typeKey: 'polling' },
  { name: '사전투표참관신청자', type: '사전투표 참관', typeKey: 'early' },
  { name: '개표참관신청자', type: '개표 참관', typeKey: 'counting' },
];

const TIME_SLOT_LABELS: Record<string, string> = {
  am: '오전',
  pm: '오후',
  d1_am: '1일차 오전',
  d1_pm: '1일차 오후',
  d2_am: '2일차 오전',
  d2_pm: '2일차 오후',
  all: '종일',
};

interface ApplicationResult {
  type: string;
  stationName: string;
  sigungu: string;
  timeSlot: string;
  timeSlotLabel: string;
  status: string;
  statusLabel: string;
  applicationId: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: '이름과 연락처를 정확히 입력해주세요.' }, { status: 400 });
    }

    const { name, phone } = parsed.data;
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

    const results: ApplicationResult[] = [];

    // 3개 신청자 시트 병렬 조회
    const responses = await Promise.all(
      SHEETS.map(s =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${s.name}!A:V`,
        }).then(res => ({ sheet: s, rows: res.data.values || [] }))
      )
    );

    for (const { sheet, rows } of responses) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowName = (row[3] || '').trim();   // D열: 성명
        if (!rowName) continue;

        // 전화번호 비교 (앞자리 0이 숫자 변환으로 잘릴 수 있어 숫자만 합쳐서 비교)
        const rowPhone = `${row[6] || ''}${row[7] || ''}${row[8] || ''}`.replace(/[^0-9]/g, '');
        if (rowPhone !== normalizedPhone || rowName !== name.trim()) continue;

        const timeSlot = row[16] || '';       // Q열
        const stationName = row[17] || '';    // R열
        const sigungu = row[18] || '';        // S열
        const applicationId = row[19] || '';  // T열
        const timestamp = row[20] || '';      // U열
        const status = row[21] || 'applied';  // V열

        results.push({
          type: sheet.type,
          stationName,
          sigungu,
          timeSlot,
          timeSlotLabel: TIME_SLOT_LABELS[timeSlot] || timeSlot,
          status,
          statusLabel: status === 'lottery' ? '추첨대기' : status === 'confirmed' ? '확정' : '신청완료',
          applicationId,
          timestamp,
        });
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ success: true, results: [], message: '신청 내역이 없습니다.' });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('check API error:', error);
    return NextResponse.json({ success: false, message: '조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
