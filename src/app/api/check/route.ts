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
  { name: '본투표참관신청자', type: '본투표 참관 (6/3 수)', typeKey: 'polling' },
  { name: '사전투표참관신청자', type: '사전투표 참관', typeKey: 'early' },
  { name: '개표참관신청자', type: '개표 참관 (6/3 수)', typeKey: 'counting' },
];

const TIME_SLOT_LABELS: Record<string, string> = {
  am: '오전',
  pm: '오후',
  d1_am: '5/29 오전',
  d1_pm: '5/29 오후',
  d2_am: '5/30 오전',
  d2_pm: '5/30 오후',
  all: '종일',
};

interface ApplicationResult {
  type: string;
  stationName: string;
  buildingName: string;
  stationAddress: string;
  sigungu: string;
  timeSlot: string;
  timeSlotLabel: string;
  status: string;
  statusLabel: string;
  applicationId: string;
  timestamp: string;
  birthDate: string;
  gender: string;
  phone: string;
  address: string;
  occupation: string;
  account: string;
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

    const STATION_SHEETS = [
      { name: '본투표소', type: 'polling' },
      { name: '사전투표소', type: 'early' },
      { name: '개표소', type: 'counting' },
    ];

    // 신청자 시트 + 투표소 시트 병렬 조회
    const [responses, stationResponses] = await Promise.all([
      Promise.all(
        SHEETS.map(s =>
          sheets.spreadsheets.values.get({ spreadsheetId, range: `${s.name}!A:V` })
            .then(res => ({ sheet: s, rows: res.data.values || [] }))
        )
      ),
      Promise.all(
        STATION_SHEETS.map(s =>
          sheets.spreadsheets.values.get({ spreadsheetId, range: `${s.name}!A:Z` })
            .then(res => ({ type: s.type, rows: res.data.values || [] }))
        )
      ),
    ]);

    // 투표소 ID → {building_name, address} 매핑
    const stationInfoMap = new Map<string, { buildingName: string; address: string }>();
    for (const { rows: sRows } of stationResponses) {
      if (sRows.length < 2) continue;
      const headers = sRows[0];
      const idIdx = headers.indexOf('id');
      const bnIdx = headers.indexOf('building_name');
      const addrIdx = headers.indexOf('address');
      for (let i = 1; i < sRows.length; i++) {
        const id = sRows[i][idIdx] || '';
        if (id) {
          stationInfoMap.set(id, {
            buildingName: (bnIdx !== -1 ? sRows[i][bnIdx] : '') || '',
            address: (addrIdx !== -1 ? sRows[i][addrIdx] : '') || '',
          });
        }
      }
    }

    for (const { sheet, rows } of responses) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowName = (row[3] || '').trim();   // D열: 성명
        if (!rowName) continue;

        // 전화번호 비교 (앞자리 0이 숫자 변환으로 잘릴 수 있어 숫자만 합쳐서 비교)
        const rowPhone = `${row[6] || ''}${row[7] || ''}${row[8] || ''}`.replace(/[^0-9]/g, '');
        if (rowPhone !== normalizedPhone || rowName !== name.trim()) continue;

        const stationId = row[15] || '';      // P열
        const timeSlot = row[16] || '';       // Q열
        const stationName = row[17] || '';    // R열
        const sigungu = row[18] || '';        // S열
        const stationInfo = stationInfoMap.get(stationId);
        const applicationId = row[19] || '';  // T열
        const timestamp = row[20] || '';      // U열
        const status = row[21] || 'applied';  // V열

        const birthDate = (row[4] || '').replace(/'/g, '');
        const gender = row[5] === '1' ? '남' : row[5] === '2' ? '여' : '';
        const phone = [row[6], row[7], row[8]].filter(Boolean).join('-');
        const address = [row[10], row[11]].filter(Boolean).join(' ');
        const occupation = row[12] || '';
        const account = row[13] || '';

        // 사전투표는 1일차/2일차 구분
        let typeLabel = sheet.type;
        if (sheet.typeKey === 'early') {
          if (timeSlot === 'd1_am' || timeSlot === 'd1_pm') typeLabel = '사전투표 참관 (1일차, 5/29 금)';
          else if (timeSlot === 'd2_am' || timeSlot === 'd2_pm') typeLabel = '사전투표 참관 (2일차, 5/30 토)';
        }

        results.push({
          type: typeLabel,
          stationName,
          buildingName: stationInfo?.buildingName || '',
          stationAddress: stationInfo?.address || '',
          sigungu,
          timeSlot,
          timeSlotLabel: TIME_SLOT_LABELS[timeSlot] || timeSlot,
          status,
          statusLabel: status === 'lottery' ? '추첨대기' : status === 'confirmed' ? '확정' : '신청완료',
          applicationId,
          timestamp,
          birthDate,
          gender,
          phone,
          address,
          occupation,
          account,
        });
      }
    }

    // 정렬: 사전1일차 → 사전2일차 → 본투표 → 개표
    const slotOrder: Record<string, number> = { d1_am: 0, d1_pm: 1, d2_am: 2, d2_pm: 3, am: 4, pm: 5, all: 6 };
    results.sort((a, b) => (slotOrder[a.timeSlot] ?? 9) - (slotOrder[b.timeSlot] ?? 9));

    if (results.length === 0) {
      return NextResponse.json({ success: true, results: [], message: '신청 내역이 없습니다.' });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('check API error:', error);
    return NextResponse.json({ success: false, message: '조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
