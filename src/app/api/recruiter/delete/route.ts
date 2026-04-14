import { NextRequest, NextResponse } from 'next/server';
import { verifyRecruiterToken } from '@/lib/auth';

async function getSheetsClient() {
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('recruiter_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const { valid, recruiterName } = verifyRecruiterToken(token);
    if (!valid) {
      return NextResponse.json({ success: false, message: '인증이 만료되었습니다.' }, { status: 401 });
    }

    const { sheetName, rowIndex, type, stationId, timeSlot } = await request.json();
    if (!sheetName || !rowIndex) {
      return NextResponse.json({ success: false, message: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

    // 해당 행이 이 모집책의 것인지 확인
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!O${rowIndex}:W${rowIndex}`,
    });
    const row = res.data.values?.[0] || [];
    const notes = (row[0] || '').trim(); // O열
    const recruiterCol = (row[8] || '').trim(); // W열

    if (recruiterCol !== recruiterName && !notes.includes(`모집:${recruiterName}`)) {
      return NextResponse.json({ success: false, message: '본인이 등록한 건만 삭제할 수 있습니다.' }, { status: 403 });
    }

    // D~O열 클리어
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!D${rowIndex}:O${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['', '', '', '', '', '', '', '', '', '', '', '']] },
    });

    // T~W열 클리어
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!T${rowIndex}:W${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['', '', '', '']] },
    });

    // 좌석 카운트 감소
    if (type && stationId && timeSlot) {
      const stationSheet = type === 'polling' ? '본투표소' : type === 'early' ? '사전투표소' : '개표소';
      const stationRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${stationSheet}!A:Z`,
      });
      const rows = stationRes.data.values || [];
      if (rows.length >= 2) {
        const headers = rows[0];
        const idIdx = headers.indexOf('id');
        const countCol = type === 'counting' ? 'current_count' : `${timeSlot}_count`;
        const colIdx = headers.indexOf(countCol);
        if (colIdx !== -1) {
          for (let i = 1; i < rows.length; i++) {
            if (rows[i][idIdx] === stationId) {
              const current = parseInt(rows[i][colIdx]) || 0;
              if (current > 0) {
                const colLetter = String.fromCharCode(65 + colIdx);
                await sheets.spreadsheets.values.update({
                  spreadsheetId,
                  range: `${stationSheet}!${colLetter}${i + 1}`,
                  valueInputOption: 'RAW',
                  requestBody: { values: [[current - 1]] },
                });
              }
              break;
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('recruiter delete error:', error);
    return NextResponse.json({ success: false, message: '삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
