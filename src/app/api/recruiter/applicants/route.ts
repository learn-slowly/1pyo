import { NextRequest, NextResponse } from 'next/server';
import { verifyRecruiterToken } from '@/lib/auth';

const SHEETS = [
  { name: '본투표참관신청자', typeKey: 'polling', typeLabel: '본투표' },
  { name: '사전투표참관신청자', typeKey: 'early', typeLabel: '사전투표' },
  { name: '개표참관신청자', typeKey: 'counting', typeLabel: '개표' },
];

const TIME_SLOT_LABELS: Record<string, string> = {
  am: '오전', pm: '오후',
  d1_am: '5/29 오전', d1_pm: '5/29 오후',
  d2_am: '5/30 오전', d2_pm: '5/30 오후',
  all: '종일',
};

async function getSheetsClient() {
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('recruiter_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const { valid, recruiterName } = verifyRecruiterToken(token);
    if (!valid) {
      return NextResponse.json({ success: false, message: '인증이 만료되었습니다.' }, { status: 401 });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
    const notesPrefix = `모집:${recruiterName}`;

    const responses = await Promise.all(
      SHEETS.map(s =>
        sheets.spreadsheets.values.get({ spreadsheetId, range: `${s.name}!A:X` })
          .then(res => ({ sheet: s, rows: res.data.values || [] }))
      )
    );

    const applicants: Record<string, unknown>[] = [];

    for (const { sheet, rows } of responses) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = (row[3] || '').trim();
        const recruiterCol = (row[22] || '').trim();
        const notes = (row[14] || '').trim();

        if (!name) continue;
        // W열(모집책) 또는 O열(비고) 기준으로 필터 (이전 데이터 호환)
        if (recruiterCol !== recruiterName && !notes.includes(notesPrefix)) continue;

        const phone = [row[6], row[7], row[8]].filter(Boolean).join('-');
        const timeSlot = row[16] || '';

        applicants.push({
          rowIndex: i + 1,
          sheetName: sheet.name,
          type: sheet.typeKey,
          typeLabel: sheet.typeLabel,
          name,
          phone,
          birthDate: row[4] || '',
          gender: row[5] === '1' ? '남' : row[5] === '2' ? '여' : '',
          address: [row[10], row[11]].filter(Boolean).join(' '),
          occupation: row[12] || '',
          account: row[13] || '',
          stationId: row[15] || '',
          stationName: row[17] || '',
          sigungu: row[18] || '',
          timeSlot,
          timeSlotLabel: TIME_SLOT_LABELS[timeSlot] || timeSlot,
          timestamp: row[20] || '',
          status: row[21] || 'applied',
          memo: row[23] || '',
        });
      }
    }

    applicants.sort((a, b) => {
      const ta = (a.timestamp as string) || '';
      const tb = (b.timestamp as string) || '';
      return tb.localeCompare(ta);
    });

    return NextResponse.json({
      success: true,
      applicants,
      total: applicants.length,
      recruiterName,
    });
  } catch (error) {
    console.error('recruiter applicants error:', error);
    return NextResponse.json({ success: false, message: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 메모 수정 (본인이 모집한 신청자 한정)
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('recruiter_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const { valid, recruiterName } = verifyRecruiterToken(token);
    if (!valid) {
      return NextResponse.json({ success: false, message: '인증이 만료되었습니다.' }, { status: 401 });
    }

    const { sheetName, rowIndex, memo } = await request.json();
    if (!sheetName || !rowIndex || memo === undefined) {
      return NextResponse.json({ success: false, message: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }
    if (typeof memo !== 'string' || memo.length > 200) {
      return NextResponse.json({ success: false, message: '메모는 200자 이내여야 합니다.' }, { status: 400 });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

    // 권한 확인: O열(notes) 또는 W열(모집책)에 본인 이름이 있어야 함
    const ownerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!O${rowIndex}:W${rowIndex}`,
    });
    const ownerRow = ownerRes.data.values?.[0] || [];
    const notes = (ownerRow[0] || '').trim();
    const recruiterCol = (ownerRow[8] || '').trim();
    if (recruiterCol !== recruiterName && !notes.includes(`모집:${recruiterName}`)) {
      return NextResponse.json({ success: false, message: '본인이 등록한 건만 수정할 수 있습니다.' }, { status: 403 });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!X${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[memo]] },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('recruiter memo update error:', error);
    return NextResponse.json({ success: false, message: '메모 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
