import { NextRequest, NextResponse } from 'next/server';
import { verifyRecruiterToken } from '@/lib/auth';
import * as XLSX from 'xlsx';

const SHEETS = [
  { name: '본투표참관신청자', typeLabel: '본투표' },
  { name: '사전투표참관신청자', typeLabel: '사전투표' },
  { name: '개표참관신청자', typeLabel: '개표' },
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
        sheets.spreadsheets.values.get({ spreadsheetId, range: `${s.name}!A:W` })
          .then(res => ({ sheet: s, rows: res.data.values || [] }))
      )
    );

    const rows: Record<string, string>[] = [];

    for (const { sheet, rows: sheetRows } of responses) {
      for (let i = 1; i < sheetRows.length; i++) {
        const row = sheetRows[i];
        const name = (row[3] || '').trim();
        const recruiterCol = (row[22] || '').trim();
        const notes = (row[14] || '').trim();

        if (!name) continue;
        if (recruiterCol !== recruiterName && !notes.includes(notesPrefix)) continue;

        const phone = [row[6], row[7], row[8]].filter(Boolean).join('-');
        const timeSlot = row[16] || '';
        const statusMap: Record<string, string> = { applied: '신청완료', confirmed: '확정', lottery: '추첨대기' };

        rows.push({
          '유형': sheet.typeLabel,
          '이름': name,
          '연락처': phone,
          '생년월일': (row[4] || '').replace(/'/g, ''),
          '성별': row[5] === '1' ? '남' : row[5] === '2' ? '여' : '',
          '시군구': row[18] || '',
          '투표소': row[17] || '',
          '시간대': TIME_SLOT_LABELS[timeSlot] || timeSlot,
          '상태': statusMap[row[21] || 'applied'] || row[21] || '',
          '신청일시': row[20] || '',
        });
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // 열 너비 설정
    ws['!cols'] = [
      { wch: 8 },  // 유형
      { wch: 10 }, // 이름
      { wch: 15 }, // 연락처
      { wch: 10 }, // 생년월일
      { wch: 5 },  // 성별
      { wch: 10 }, // 시군구
      { wch: 20 }, // 투표소
      { wch: 12 }, // 시간대
      { wch: 8 },  // 상태
      { wch: 20 }, // 신청일시
    ];

    XLSX.utils.book_append_sheet(wb, ws, '모집현황');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = encodeURIComponent(`모집현황_${recruiterName}_${new Date().toISOString().slice(0, 10)}.xlsx`);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    console.error('recruiter download error:', error);
    return NextResponse.json({ success: false, message: '다운로드 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
