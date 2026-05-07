import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

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
    const { searchParams } = request.nextUrl;
    const filterTypes = (searchParams.get('type') || '').split(',').map(s => s.trim()).filter(Boolean);
    const filterSigungus = (searchParams.get('sigungu') || '').split(',').map(s => s.trim()).filter(Boolean);
    const filterStatuses = (searchParams.get('status') || '').split(',').map(s => s.trim()).filter(Boolean);
    const filterAddress = (searchParams.get('address') || '').trim();
    const filterRecruiters = (searchParams.get('recruiter') || '').split(',').map(s => s.trim()).filter(Boolean);
    const filterMemo = (searchParams.get('memo') || '').trim();

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

    const sheetsToQuery = filterTypes.length > 0
      ? SHEETS.filter(s => filterTypes.includes(s.typeKey))
      : SHEETS;

    const responses = await Promise.all(
      sheetsToQuery.map(s =>
        sheets.spreadsheets.values.get({ spreadsheetId, range: `${s.name}!A:X` })
          .then(res => ({ sheet: s, rows: res.data.values || [] }))
      )
    );

    const rows: string[][] = [[
      '유형', '이름', '생년월일', '성별', '연락처',
      '우편번호', '기본주소', '상세주소', '직업', '계좌',
      '시군구', '투표소', '시간대', '상태', '비고', '모집책', '메모',
    ]];

    for (const { sheet, rows: sheetRows } of responses) {
      for (let i = 1; i < sheetRows.length; i++) {
        const row = sheetRows[i];
        const name = (row[3] || '').trim();
        if (!name) continue;

        const sigungu = row[18] || '';
        const status = row[21] || 'applied';
        const address = row[10] || '';
        const addressDetail = row[11] || '';
        const recruiter = row[22] || '';
        const memo = row[23] || '';

        if (filterSigungus.length > 0 && !filterSigungus.includes(sigungu)) continue;
        if (filterStatuses.length > 0 && !filterStatuses.includes(status)) continue;
        if (filterRecruiters.length > 0) {
          const matchNone = filterRecruiters.includes('__none__') && recruiter === '';
          const matchName = filterRecruiters.filter(r => r !== '__none__').includes(recruiter);
          if (!matchNone && !matchName) continue;
        }
        if (filterAddress) {
          const combined = `${address} ${addressDetail}`.toLowerCase();
          if (!combined.includes(filterAddress.toLowerCase())) continue;
        }
        if (filterMemo && !memo.toLowerCase().includes(filterMemo.toLowerCase())) continue;

        const phone = [row[6], row[7], row[8]].filter(Boolean).join('-');
        const timeSlot = row[16] || '';
        const statusLabel = status === 'confirmed' ? '확정' : status === 'lottery' ? '추첨대기' : '신청완료';

        rows.push([
          sheet.typeLabel,
          name,
          (row[4] || '').replace(/'/g, ''),
          row[5] === '1' ? '남' : row[5] === '2' ? '여' : '',
          phone,
          row[9] || '',
          address,
          addressDetail,
          row[12] || '',
          row[13] || '',
          sigungu,
          row[17] || '',
          TIME_SLOT_LABELS[timeSlot] || timeSlot,
          statusLabel,
          row[14] || '',
          recruiter,
          memo,
        ]);
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    ws['!cols'] = [
      { wch: 8 },   // 유형
      { wch: 8 },   // 이름
      { wch: 10 },  // 생년월일
      { wch: 4 },   // 성별
      { wch: 15 },  // 연락처
      { wch: 8 },   // 우편번호
      { wch: 30 },  // 기본주소
      { wch: 20 },  // 상세주소
      { wch: 10 },  // 직업
      { wch: 24 },  // 계좌
      { wch: 12 },  // 시군구
      { wch: 20 },  // 투표소
      { wch: 10 },  // 시간대
      { wch: 8 },   // 상태
      { wch: 16 },  // 비고
      { wch: 10 },  // 모집책
      { wch: 20 },  // 메모
    ];

    XLSX.utils.book_append_sheet(wb, ws, '신청자인적사항');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const datePart = new Date().toISOString().slice(0, 10);
    const typeMap: Record<string, string> = { polling: '본투표', early: '사전투표', counting: '개표' };
    const statusMap: Record<string, string> = { confirmed: '확정', applied: '신청완료', lottery: '추첨대기' };
    const nameParts = [
      filterTypes.map(t => typeMap[t] || t).join('+'),
      filterSigungus.join('+'),
      filterRecruiters.join('+'),
      filterAddress,
      filterMemo,
      filterStatuses.map(s => statusMap[s] || s).join('+'),
    ].filter(Boolean).join('_');
    const filename = encodeURIComponent(`신청자인적사항_${nameParts ? nameParts + '_' : ''}${datePart}.xlsx`);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    console.error('admin download error:', error);
    return NextResponse.json({ success: false, message: '다운로드 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
