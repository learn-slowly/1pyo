import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 수동 파싱
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

// 1) 설정 시트에 새 키 추가
async function addConfigKeys() {
  // 기존 설정 읽기
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '설정!A:B',
  });
  const existing = res.data.values || [];
  const existingKeys = new Set(existing.map(r => r[0]));

  const newKeys = [
    ['region_name', '경남'],
    ['contact_1_label', '진주'],
    ['contact_1_number', '010-5168-2404'],
    ['contact_2_label', '진주 외 경남 전역'],
    ['contact_2_number', '010-5960-5190'],
    ['contact_notice', '업무 폭주로 응대가 늦습니다. 불필요한 통화 시도시 신청 반려합니다.'],
    ['guide_intro', '6월 3일 지방선거, 경남에서 정의당에 투표할 수 있는 곳은 다음과 같습니다.'],
    ['guide_outro', '이 소중한 표가 제대로 세어지려면, 우리 눈이 현장에 있어야 합니다. 여러분은 정의당이 파견한, <strong>정의당의 한 표를 지키는 파수꾼</strong>입니다.'],
  ];

  const toAdd = newKeys.filter(([key]) => !existingKeys.has(key));

  if (toAdd.length === 0) {
    console.log('설정 시트: 이미 모든 키가 존재합니다.');
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: '설정!A:B',
    valueInputOption: 'RAW',
    requestBody: { values: toAdd },
  });

  console.log(`설정 시트: ${toAdd.length}개 키 추가 완료`);
  toAdd.forEach(([k, v]) => console.log(`  ${k} = ${v}`));
}

// 2) 후보정보 시트 생성 + 데이터 입력
async function createCandidateSheet() {
  // 시트 목록 확인
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = meta.data.sheets?.map(s => s.properties?.title) || [];

  if (!sheetNames.includes('후보정보')) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: '후보정보' } },
        }],
      },
    });
    console.log('후보정보 시트 생성 완료');
  } else {
    console.log('후보정보 시트가 이미 존재합니다.');
  }

  // 헤더 + 데이터 쓰기
  const values = [
    ['title', 'description', 'detail_label', 'detail_content'],
    ['경남도의회 비례대표', '경남 전역 — 경남 어디에 살든, 도의회 비례대표에서 정의당을 선택할 수 있습니다.', '', ''],
    ['창원시의회 비례대표', '창원시 전역 — 창원시 유권자라면 시의회 비례대표에서도 정의당에 투표할 수 있습니다.', '', ''],
    ['진주시의원 라선거구 — 김용국 후보', '진주시 라선거구에서는 정의당 김용국 후보에게 직접 투표할 수 있습니다.', '라선거구 해당 지역', '천전동(망경, 강남, 주약, 칠암) · 가호동(가좌, 호탄) · 성북동(본성, 남성, 인사, 중안, 봉곡, 계동)'],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: '후보정보!A1:D4',
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  console.log('후보정보 데이터 입력 완료 (3건)');
}

async function main() {
  try {
    await addConfigKeys();
    await createCandidateSheet();
    console.log('\n모든 작업 완료!');
  } catch (err) {
    console.error('오류:', err.message);
    process.exit(1);
  }
}

main();
