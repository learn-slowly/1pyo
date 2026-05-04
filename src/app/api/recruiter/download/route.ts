import { NextRequest, NextResponse } from 'next/server';
import { verifyRecruiterToken } from '@/lib/auth';
import * as XLSX from 'xlsx';

const SHEETS = [
  { name: '사전투표참관신청자', type: 'early' },
  { name: '본투표참관신청자', type: 'polling' },
  { name: '개표참관신청자', type: 'counting' },
];

// time_slot → 엑셀 열 매핑
const SLOT_COL: Record<string, string> = {
  d1_am: '5/29(금) 오전',
  d1_pm: '5/29(금) 오후',
  d2_am: '5/30(토) 오전',
  d2_pm: '5/30(토) 오후',
  am: '본투표 오전',
  pm: '본투표 오후',
  all: '개표',
};

const COL_ORDER = ['5/29(금) 오전', '5/29(금) 오후', '5/30(토) 오전', '5/30(토) 오후', '본투표 오전', '본투표 오후', '개표'];

async function getSheetsClient() {
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

interface PersonRow {
  name: string;
  birthDate: string;
  address: string;
  phone: string;
  occupation: string;
  account: string;
  relation: string;
  memo: string;
  slots: Record<string, string>; // colName → stationName
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

    // 전화번호 기준으로 한 사람 = 한 행으로 합치기
    const personMap = new Map<string, PersonRow>();

    for (const { rows: sheetRows } of responses) {
      for (let i = 1; i < sheetRows.length; i++) {
        const row = sheetRows[i];
        const name = (row[3] || '').trim();
        const recruiterCol = (row[22] || '').trim();
        const notes = (row[14] || '').trim();

        if (!name) continue;
        if (recruiterCol !== recruiterName && !notes.includes(notesPrefix)) continue;

        const phoneKey = `${row[6] || ''}${row[7] || ''}${row[8] || ''}`.replace(/[^0-9]/g, '');
        const phone = [row[6], row[7], row[8]].filter(Boolean).join('-');
        const timeSlot = row[16] || '';
        const stationName = row[17] || '';
        const memo = (row[23] || '').trim();
        const colName = SLOT_COL[timeSlot];
        if (!colName) continue;

        // 관계 추출: notes에서 모집:xxx 제거, 나머지 표시
        let relation = '';
        if (notes) {
          relation = notes
            .split(',')
            .filter((p: string) => !p.startsWith('모집:'))
            .join(',')
            .trim();
        }

        if (!personMap.has(phoneKey)) {
          personMap.set(phoneKey, {
            name,
            birthDate: (row[4] || '').replace(/'/g, ''),
            address: [row[10], row[11]].filter(Boolean).join(' '),
            phone,
            occupation: row[12] || '',
            account: row[13] || '',
            relation,
            memo,
            slots: {},
          });
        }

        const person = personMap.get(phoneKey)!;
        person.slots[colName] = stationName;
        // 관계가 비어있으면 다른 시트에서 채우기
        if (!person.relation && relation) {
          person.relation = relation;
        }
        // 비고도 동일하게: 비어있으면 다른 시트에서 채우기, 다르면 합치기
        if (memo && !person.memo.split(' / ').includes(memo)) {
          person.memo = person.memo ? `${person.memo} / ${memo}` : memo;
        }
      }
    }

    // 엑셀 데이터 구성
    const headers = ['이름', '생년월일', '주소', '연락처', '직업', '계좌', ...COL_ORDER, '관계', '비고'];
    const excelRows: string[][] = [headers];

    for (const person of personMap.values()) {
      excelRows.push([
        person.name,
        person.birthDate,
        person.address,
        person.phone,
        person.occupation,
        person.account,
        ...COL_ORDER.map(col => person.slots[col] || ''),
        person.relation,
        person.memo,
      ]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelRows);

    ws['!cols'] = [
      { wch: 8 },   // 이름
      { wch: 10 },  // 생년월일
      { wch: 30 },  // 주소
      { wch: 15 },  // 연락처
      { wch: 8 },   // 직업
      { wch: 20 },  // 계좌
      { wch: 14 },  // 5/29 오전
      { wch: 14 },  // 5/29 오후
      { wch: 14 },  // 5/30 오전
      { wch: 14 },  // 5/30 오후
      { wch: 14 },  // 본투표 오전
      { wch: 14 },  // 본투표 오후
      { wch: 14 },  // 개표
      { wch: 12 },  // 관계
      { wch: 24 },  // 비고
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
