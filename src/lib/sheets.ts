import type {
  Config,
  ObservationType,
  Station,
  ApplicationRequest,
  MemberVerifyResponse,
  VoterCountReport,
  IncidentReport,
} from './types';

// Google Sheets가 설정되지 않으면 mock 사용
const useMock = !process.env.GOOGLE_PRIVATE_KEY;

async function getMock() {
  return await import('./sheets-mock');
}

// === 캐시 ===
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30_000; // 30초

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// === Google Sheets 클라이언트 ===
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

// === Config ===
export async function getConfig(): Promise<Config> {
  if (useMock) return (await getMock()).getConfig();

  const cached = getCached<Config>('config');
  if (cached) return cached;

  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: '설정!A:B',
  });

  const rows = res.data.values || [];
  const configMap: Record<string, string> = {};
  for (const [key, value] of rows) {
    if (key) configMap[key] = value || '';
  }

  const config: Config = {
    mode: (configMap.mode as Config['mode']) || 'public',
    password: configMap.password,
    lottery_mode: configMap.lottery_mode === 'on',
    sido: configMap.sido || '',
  };

  setCache('config', config);
  return config;
}

// === Stations ===
export async function getStations(type: ObservationType, sigungu?: string): Promise<Station[]> {
  if (useMock) return (await getMock()).getStations(type, sigungu);

  const cacheKey = `stations_${type}`;
  let stations = getCached<Station[]>(cacheKey);

  if (!stations) {
    const sheets = await getSheetsClient();
    const sheetName = type === 'polling' ? '본투표소' : type === 'early' ? '사전투표소' : '개표소';

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A:Z`,
    });

    const rows = res.data.values || [];
    if (rows.length < 2) return [];

    const headers = rows[0];
    stations = rows.slice(1).map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h: string, i: number) => {
        obj[h] = row[i] || '';
      });
      return parseStation(obj, type);
    });

    setCache(cacheKey, stations);
  }

  if (sigungu) {
    stations = stations.filter(s => s.sigungu === sigungu);
  }

  return stations;
}

function parseStation(row: Record<string, string>, type: ObservationType): Station {
  switch (type) {
    case 'polling':
      return {
        type: 'polling',
        id: row.id,
        sigungu: row.sigungu,
        electorate: row.electorate,
        station_name: row.station_name,
        building_name: row.building_name || '',
        address: row.address,
        am_count: parseInt(row.am_count) || 0,
        pm_count: parseInt(row.pm_count) || 0,
        am_max: parseInt(row.am_max) || 1,
        pm_max: parseInt(row.pm_max) || 1,
      };
    case 'early':
      return {
        type: 'early',
        id: row.id,
        sigungu: row.sigungu,
        dong: row.dong,
        station_name: row.station_name,
        building_name: row.building_name || '',
        address: row.address,
        d1_am_count: parseInt(row.d1_am_count) || 0,
        d1_pm_count: parseInt(row.d1_pm_count) || 0,
        d2_am_count: parseInt(row.d2_am_count) || 0,
        d2_pm_count: parseInt(row.d2_pm_count) || 0,
        slot_max: parseInt(row.slot_max) || 1,
      };
    case 'counting':
      return {
        type: 'counting',
        id: row.id,
        sigungu: row.sigungu,
        station_name: row.station_name,
        building_name: row.building_name || '',
        address: row.address,
        current_count: parseInt(row.current_count) || 0,
        max_count: parseInt(row.max_count) || 6,
      };
  }
}

export async function getSigunguList(type: ObservationType): Promise<string[]> {
  if (useMock) return (await getMock()).getSigunguList(type);

  const stations = await getStations(type);
  return [...new Set(stations.map(s => s.sigungu))].sort();
}

// === 당원명단 시트 이름 조회 ===
async function getMemberSheetName(): Promise<string> {
  const cached = getCached<string>('member_sheet_name');
  if (cached) return cached;

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const sheetNames = (meta.data.sheets || []).map(s => s.properties?.title || '');
  // NFC 정규화해서 "당원명단"과 매칭
  const target = '당원명단'.normalize('NFC');
  const found = sheetNames.find(name => name.normalize('NFC') === target);
  if (!found) throw new Error('당원명단 시트를 찾을 수 없습니다.');

  setCache('member_sheet_name', found);
  return found;
}

// === 당원 인증 ===
export async function verifyMember(
  name: string,
  birthDate: string,
): Promise<MemberVerifyResponse> {
  if (useMock) return (await getMock()).verifyMember(name, birthDate);

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const sheetName = await getMemberSheetName();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!B:D`, // B=이름, D=생년월일
  });

  const rows = res.data.values || [];
  const normalizedBirth = birthDate.replace(/[^0-9]/g, '');

  for (let i = 1; i < rows.length; i++) {
    const rowName = (rows[i][0] || '').trim();
    const rowBirth = (rows[i][2] || '').replace(/[^0-9]/g, '');
    if (rowName === name.trim() && rowBirth === normalizedBirth) {
      return { verified: true, message: '당원 인증이 완료되었습니다.' };
    }
  }

  return { verified: false, message: '당원 명단에서 확인되지 않습니다.' };
}

// === 신청자 시트 이름 ===
const APPLICANT_SHEETS: Record<string, string> = {
  polling: '본투표참관신청자',
  early: '사전투표참관신청자',
  counting: '개표참관신청자',
};

// 같은 날 그룹 판별 (같은 그룹이면 중복 신청 불가)
function getDayGroup(timeSlot: string): string {
  if (timeSlot === 'am' || timeSlot === 'pm') return 'election_day';
  if (timeSlot === 'd1_am' || timeSlot === 'd1_pm') return 'early_d1';
  if (timeSlot === 'd2_am' || timeSlot === 'd2_pm') return 'early_d2';
  return 'counting_day'; // 'all'
}

// === Applications ===
export async function submitApplication(
  data: ApplicationRequest,
  options?: { skipBlacklist?: boolean; notes?: string },
): Promise<{ success: boolean; id: string; status: string; message: string }> {
  if (useMock) return (await getMock()).submitApplication(data);

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const normalizedPhone = data.phone.replace(/[^0-9]/g, '');
  const applicantSheet = APPLICANT_SHEETS[data.type];
  const myDayGroup = getDayGroup(data.time_slot);

  // 신청자 시트 전체 읽기
  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${applicantSheet}!A:V`,
  });
  const existingRows = existingRes.data.values || [];

  // 블랙리스트 체크 (관리자 등록 시 건너뜀)
  if (options?.skipBlacklist) {
    // skip
  } else {
  const blacklistRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '블랙리스트!A:A',
  });
  const blacklistRows = blacklistRes.data.values || [];
  for (let i = 1; i < blacklistRows.length; i++) {
    const blPhone = (blacklistRows[i][0] || '').replace(/[^0-9]/g, '');
    if (blPhone && blPhone === normalizedPhone) {
      return { success: false, id: '', status: '', message: '참관인 모집 규정 위반으로 참관인 신청이 반려되었습니다.' };
    }
  }
  }

  // 중복 체크: 같은 전화번호 + 같은 날 → 장소 무관하게 차단
  for (let i = 1; i < existingRows.length; i++) {
    const row = existingRows[i];
    if (!row[3]) continue; // D열(성명) 비어있으면 skip
    const rowPhone = `${row[6] || ''}${row[7] || ''}${row[8] || ''}`.replace(/[^0-9]/g, '');
    if (rowPhone !== normalizedPhone) continue;

    const rowTimeSlot = row[16] || ''; // Q열: time_slot
    if (getDayGroup(rowTimeSlot) === myDayGroup) {
      return { success: false, id: '', status: '', message: '같은 날에 이미 신청한 내역이 있습니다. 하루에 한 타임만 신청할 수 있습니다.' };
    }
  }

  // 크로스 체크: 본투표 오후 ↔ 개표 상호 차단
  if (data.type === 'counting' || (data.type === 'polling' && data.time_slot === 'pm')) {
    const crossSheet = data.type === 'counting'
      ? APPLICANT_SHEETS.polling   // 개표 신청 시 → 본투표 시트 확인
      : APPLICANT_SHEETS.counting; // 본투표 오후 신청 시 → 개표 시트 확인
    const crossSlot = data.type === 'counting' ? 'pm' : 'all';

    const crossRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${crossSheet}!A:V`,
    });
    const crossRows = crossRes.data.values || [];
    for (let i = 1; i < crossRows.length; i++) {
      const row = crossRows[i];
      if (!row[3]) continue;
      const rowPhone = `${row[6] || ''}${row[7] || ''}${row[8] || ''}`.replace(/[^0-9]/g, '');
      if (rowPhone !== normalizedPhone) continue;

      const rowTimeSlot = row[16] || '';
      if (rowTimeSlot === crossSlot) {
        const msg = data.type === 'counting'
          ? '본투표 오후 참관인으로 신청되어 있어 개표 참관인을 신청할 수 없습니다.'
          : '개표 참관인으로 신청되어 있어 본투표 오후를 신청할 수 없습니다.';
        return { success: false, id: '', status: '', message: msg };
      }
    }
  }

  // 빈 슬롯 찾기 (P열=station_id, Q열=time_slot 매칭, D열=성명이 비어있는 행)
  let targetRowIdx = -1;
  for (let i = 1; i < existingRows.length; i++) {
    const row = existingRows[i];
    const rowStationId = row[15] || '';  // P열
    const rowTimeSlot = row[16] || '';   // Q열
    const hasName = (row[3] || '').trim() !== ''; // D열
    if (rowStationId === data.station_id && rowTimeSlot === data.time_slot && !hasName) {
      targetRowIdx = i;
      break;
    }
  }

  // 빈 슬롯 없음 → 추첨 또는 마감
  const config = await getConfig();
  if (targetRowIdx === -1) {
    if (config.lottery_mode) {
      // 추첨 모드: 시트 맨 아래에 추가 행 append
    } else {
      return { success: false, id: '', status: '', message: '해당 시간대의 정원이 마감되었습니다.' };
    }
  }

  const status = targetRowIdx === -1 ? 'lottery' : 'applied';
  const id = `APP-${Date.now()}`;

  // 전화번호 분리
  const phone1 = normalizedPhone.slice(0, 3);
  const phone2 = normalizedPhone.slice(3, 7);
  const phone3 = normalizedPhone.slice(7);

  // 비고 생성 (당원 인증 정보 + 기존 notes)
  let notes = options?.notes || '';
  if (data.member_verification) {
    const mv = data.member_verification;
    if (mv.member_type === 'member') {
      notes = notes ? `당원,${notes}` : '당원';
    } else if (mv.member_type === 'acquaintance') {
      const tag = `당원지인(${mv.referrer_name})`;
      notes = notes ? `${tag},${notes}` : tag;
    }
  }

  // D~O열 (신청자 정보) + T~V열 (관리용)
  const applicantData = [
    data.name,            // D: 성명
    "'" + data.birth_date,// E: 생년월일 (텍스트)
    data.gender,          // F: 성별
    "'" + phone1,         // G: 전화1 (텍스트, 앞자리 0 보존)
    "'" + phone2,         // H: 전화2 (텍스트)
    "'" + phone3,         // I: 전화3 (텍스트)
    data.zip_code,        // J: 우편번호
    data.address,         // K: 기본주소
    data.address_detail,  // L: 상세주소
    data.occupation,      // M: 직업
    data.account,         // N: 계좌
    notes,                // O: 비고
  ];

  if (targetRowIdx !== -1) {
    // 기존 빈 행에 채우기 (D~O열)
    const rowNum = targetRowIdx + 1; // 1-based
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${applicantSheet}!D${rowNum}:O${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [applicantData] },
    });
    // T~V열 (신청ID, timestamp, status)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${applicantSheet}!T${rowNum}:V${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[id, new Date().toISOString(), status]] },
    });
  } else {
    // 추첨: 맨 아래에 새 행 추가
    let timeCode = '3';
    if (data.time_slot.includes('am')) timeCode = '1';
    else if (data.time_slot.includes('pm')) timeCode = '2';

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${applicantSheet}!A:V`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          '', '', timeCode,
          ...applicantData,
          data.station_id, data.time_slot, data.station_name, data.sigungu,
          id, new Date().toISOString(), status,
        ]],
      },
    });
  }

  // 좌석 카운트 업데이트 (추첨이 아닌 경우)
  if (status !== 'lottery') {
    cache.delete(`stations_${data.type}`);
    await updateSeatCount(sheets, spreadsheetId, data.type, data.station_id, data.time_slot);
  }

  const message = status === 'lottery'
    ? '추첨 신청이 완료되었습니다.'
    : '신청이 완료되었습니다.';

  return { success: true, id, status, message };
}

function checkSlotFull(station: Station, timeSlot: string): boolean {
  switch (station.type) {
    case 'polling':
      if (timeSlot === 'am') return station.am_count >= station.am_max;
      if (timeSlot === 'pm') return station.pm_count >= station.pm_max;
      return false;
    case 'early': {
      const key = `${timeSlot}_count` as keyof typeof station;
      return (station[key] as number) >= station.slot_max;
    }
    case 'counting':
      return station.current_count >= station.max_count;
  }
}

async function updateSeatCount(
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  spreadsheetId: string,
  type: ObservationType,
  stationId: string,
  timeSlot: string,
): Promise<void> {
  const sheetName = type === 'polling' ? '본투표소' : type === 'early' ? '사전투표소' : '개표소';

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return;

  const headers = rows[0];
  const idIdx = headers.indexOf('id');

  let countCol: string;
  if (type === 'counting') {
    countCol = 'current_count';
  } else {
    countCol = `${timeSlot}_count`;
  }

  const colIdx = headers.indexOf(countCol);
  if (colIdx === -1) return;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === stationId) {
      const currentCount = parseInt(rows[i][colIdx]) || 0;
      const colLetter = String.fromCharCode(65 + colIdx);
      const rowNum = i + 1;

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${colLetter}${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[currentCount + 1]],
        },
      });
      break;
    }
  }
}

// === 참관 보고 ===
export async function submitVoterCountReport(
  data: VoterCountReport,
): Promise<{ success: boolean; message: string }> {
  if (useMock) return (await getMock()).submitVoterCountReport(data);

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: '투표인수보고!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toISOString(),
        data.reporter_name,
        data.reporter_phone,
        data.observation_type === 'polling' ? '본투표' : '사전투표',
        data.station_name,
        data.sigungu,
        data.report_hour,
        data.cumulative_voters,
      ]],
    },
  });

  return { success: true, message: '투표인수가 보고되었습니다.' };
}

export async function submitIncidentReport(
  data: IncidentReport,
): Promise<{ success: boolean; message: string }> {
  if (useMock) return (await getMock()).submitIncidentReport(data);

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const typeLabel = data.observation_type === 'polling' ? '본투표'
    : data.observation_type === 'early' ? '사전투표' : '개표';

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: '특이사항보고!A:J',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toISOString(),
        data.reporter_name,
        data.reporter_phone,
        typeLabel,
        data.station_name,
        data.sigungu,
        data.incident_type,
        data.description,
        data.objection_filed ? 'Y' : 'N',
        data.objection_result,
      ]],
    },
  });

  return { success: true, message: '특이사항이 보고되었습니다.' };
}

// === 블랙리스트 ===
export async function addToBlacklist(phone: string, reason: string = ''): Promise<{ success: boolean; message: string }> {
  if (useMock) {
    console.log('[Mock] 블랙리스트 추가:', phone, reason);
    return { success: true, message: `${phone} 블랙리스트에 추가되었습니다.` };
  }

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const normalized = phone.replace(/[^0-9]/g, '');

  // 중복 체크
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '블랙리스트!A:B',
  });
  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    const existing = (rows[i][0] || '').replace(/[^0-9]/g, '');
    if (existing === normalized) {
      return { success: false, message: `${phone}은(는) 이미 블랙리스트에 있습니다.` };
    }
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: '블랙리스트!A:B',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [["'" + normalized, reason]],
    },
  });

  return { success: true, message: `${phone} 블랙리스트에 추가되었습니다.${reason ? ` (사유: ${reason})` : ''}` };
}

export async function removeFromBlacklist(phone: string): Promise<{ success: boolean; message: string }> {
  if (useMock) {
    console.log('[Mock] 블랙리스트 삭제:', phone);
    return { success: true, message: `${phone} 블랙리스트에서 제거되었습니다.` };
  }

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const normalized = phone.replace(/[^0-9]/g, '');

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '블랙리스트!A:A',
  });
  const rows = res.data.values || [];

  for (let i = 1; i < rows.length; i++) {
    const existing = (rows[i][0] || '').replace(/[^0-9]/g, '');
    if (existing === normalized) {
      // 해당 셀 비우기
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `블랙리스트!A${i + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['']] },
      });
      return { success: true, message: `${phone} 블랙리스트에서 제거되었습니다.` };
    }
  }

  return { success: false, message: `${phone}은(는) 블랙리스트에 없습니다.` };
}
