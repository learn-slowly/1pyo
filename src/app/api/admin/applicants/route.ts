import { NextRequest, NextResponse } from 'next/server';

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
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
    const { searchParams } = request.nextUrl;
    const filterType = searchParams.get('type');
    const filterSigungu = searchParams.get('sigungu');
    const filterStatus = searchParams.get('status');

    const sheetsToQuery = filterType
      ? SHEETS.filter(s => s.typeKey === filterType)
      : SHEETS;

    const responses = await Promise.all(
      sheetsToQuery.map(s =>
        sheets.spreadsheets.values.get({ spreadsheetId, range: `${s.name}!A:W` })
          .then(res => ({ sheet: s, rows: res.data.values || [] }))
      )
    );

    const applicants: Record<string, unknown>[] = [];
    const allSigungu = new Set<string>();
    const stats = { total: 0, totalSlots: 0, byType: {} as Record<string, { filled: number; total: number }>, byStatus: {} as Record<string, number> };

    for (const { sheet, rows } of responses) {
      let typeFilled = 0;
      const typeTotal = rows.length - 1;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = (row[3] || '').trim();
        const stationId = row[15] || '';
        const timeSlot = row[16] || '';
        const stationName = row[17] || '';
        const sigungu = row[18] || '';
        const applicationId = row[19] || '';
        const timestamp = row[20] || '';
        const status = row[21] || '';

        if (sigungu) allSigungu.add(sigungu);

        if (name) {
          typeFilled++;
          stats.total++;
          stats.byStatus[status || 'applied'] = (stats.byStatus[status || 'applied'] || 0) + 1;

          if (filterSigungu && sigungu !== filterSigungu) continue;
          if (filterStatus && status !== filterStatus) continue;

          const phone = [row[6], row[7], row[8]].filter(Boolean).join('-');

          applicants.push({
            rowIndex: i + 1,
            sheetName: sheet.name,
            type: sheet.typeKey,
            typeLabel: sheet.typeLabel,
            serialNo: row[0] || '',
            name,
            phone,
            birthDate: row[4] || '',
            gender: row[5] === '1' ? '남' : row[5] === '2' ? '여' : '',
            stationId,
            timeSlot,
            timeSlotLabel: TIME_SLOT_LABELS[timeSlot] || timeSlot,
            stationName,
            sigungu,
            applicationId,
            timestamp,
            status: status || 'applied',
            notes: row[14] || '',
            recruiter: row[22] || '',
          });
        }
        stats.totalSlots++;
      }

      stats.byType[sheet.typeKey] = { filled: typeFilled, total: typeTotal };
    }

    // 최신순 정렬
    applicants.sort((a, b) => {
      const ta = (a.timestamp as string) || '';
      const tb = (b.timestamp as string) || '';
      return tb.localeCompare(ta);
    });

    return NextResponse.json({ success: true, applicants, stats, sigunguList: [...allSigungu].sort() });
  } catch (error) {
    console.error('admin applicants error:', error);
    return NextResponse.json({ success: false, message: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 상태 변경
export async function PATCH(request: NextRequest) {
  try {
    const { sheetName, rowIndex, status } = await request.json();
    if (!sheetName || !rowIndex || !status) {
      return NextResponse.json({ success: false, message: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!V${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[status]] },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('admin status change error:', error);
    return NextResponse.json({ success: false, message: '상태 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 삭제 (D~O, T~V 클리어, A~C/P~S 유지)
export async function DELETE(request: NextRequest) {
  try {
    const { sheetName, rowIndex, type, stationId, timeSlot } = await request.json();
    if (!sheetName || !rowIndex) {
      return NextResponse.json({ success: false, message: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

    // D~O열 (신청자 정보) 클리어
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!D${rowIndex}:O${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['', '', '', '', '', '', '', '', '', '', '', '']] },
    });

    // T~W열 (관리용) 클리어
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!T${rowIndex}:W${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['', '', '', '']] },
    });

    // 좌석 카운트 감소
    if (type && stationId && timeSlot) {
      const stationSheet = type === 'polling' ? '본투표소' : type === 'early' ? '사전투표소' : '개표소';
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${stationSheet}!A:Z`,
      });
      const rows = res.data.values || [];
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
    console.error('admin delete error:', error);
    return NextResponse.json({ success: false, message: '삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
