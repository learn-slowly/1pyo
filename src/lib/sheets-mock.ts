import type {
  Config,
  CandidateInfo,
  PollingStation,
  EarlyStation,
  CountingStation,
  ObservationType,
  Station,
  ApplicationRequest,
  MemberVerifyResponse,
  VoterCountReport,
  IncidentReport,
} from './types';

// === Mock Config ===
const mockConfig: Config = {
  mode: 'public',
  lottery_mode: false,
  sido: '경상남도',
  region_name: '경남',
  contacts: [
    { label: '진주', number: '010-5168-2404' },
    { label: '진주 외 경남 전역', number: '010-5960-5190' },
  ],
  contact_notice: '업무 폭주로 응대가 늦습니다. 불필요한 통화 시도시 신청 반려합니다.',
  guide_intro: '6월 3일 지방선거, 경남에서 정의당에 투표할 수 있는 곳은 다음과 같습니다.',
  guide_outro: '이 소중한 표가 제대로 세어지려면, 우리 눈이 현장에 있어야 합니다. 여러분은 정의당이 파견한, <strong>정의당의 한 표를 지키는 파수꾼</strong>입니다.',
};

// === Mock 후보정보 ===
const mockCandidates: CandidateInfo[] = [
  { title: '경남도의회 비례대표', description: '경남 전역 — 경남 어디에 살든, 도의회 비례대표에서 정의당을 선택할 수 있습니다.' },
  { title: '창원시의회 비례대표', description: '창원시 전역 — 창원시 유권자라면 시의회 비례대표에서도 정의당에 투표할 수 있습니다.' },
  { title: '진주시의원 라선거구 — 김용국 후보', description: '진주시 라선거구에서는 정의당 김용국 후보에게 직접 투표할 수 있습니다.', detail_label: '라선거구 해당 지역', detail_content: '천전동(망경, 강남, 주약, 칠암) · 가호동(가좌, 호탄) · 성북동(본성, 남성, 인사, 중안, 봉곡, 계동)' },
];

// === Mock 본투표소 ===
const mockPollingStations: PollingStation[] = [
  { id: 'PS-001', sigungu: '진주시', electorate: '진주시 가선거구', station_name: '진주초등학교', building_name: '체육관(1층)', address: '진주시 중앙로 1', am_count: 1, pm_count: 0, am_max: 1, pm_max: 1 },
  { id: 'PS-002', sigungu: '진주시', electorate: '진주시 가선거구', station_name: '진주중학교', building_name: '강당(2층)', address: '진주시 대안로 15', am_count: 0, pm_count: 0, am_max: 1, pm_max: 1 },
  { id: 'PS-003', sigungu: '진주시', electorate: '진주시 나선거구', station_name: '경상대학교', building_name: '학생회관(1층)', address: '진주시 진주대로 501', am_count: 1, pm_count: 1, am_max: 1, pm_max: 1 },
  { id: 'PS-004', sigungu: '김해시', electorate: '김해시 가선거구', station_name: '김해초등학교', building_name: '체육관(1층)', address: '김해시 가야로 1', am_count: 0, pm_count: 0, am_max: 1, pm_max: 1 },
  { id: 'PS-005', sigungu: '김해시', electorate: '김해시 가선거구', station_name: '김해중앙초등학교', building_name: '강당(1층)', address: '김해시 중앙대로 22', am_count: 0, pm_count: 1, am_max: 1, pm_max: 1 },
  { id: 'PS-006', sigungu: '창원시', electorate: '창원시 가선거구', station_name: '용호초등학교', building_name: '체육관(1층)', address: '창원시 의창구 용호로 5', am_count: 0, pm_count: 0, am_max: 1, pm_max: 1 },
  { id: 'PS-007', sigungu: '창원시', electorate: '창원시 나선거구', station_name: '마산초등학교', building_name: '강당(1층)', address: '창원시 마산합포구 합포로 10', am_count: 1, pm_count: 1, am_max: 1, pm_max: 1 },
];

// === Mock 사전투표소 ===
const mockEarlyStations: EarlyStation[] = [
  { id: 'ES-001', sigungu: '진주시', dong: '상봉동', station_name: '상봉동주민센터', building_name: '주민센터(1층)', address: '진주시 상봉로 1', d1_am_count: 0, d1_pm_count: 0, d2_am_count: 0, d2_pm_count: 0, slot_max: 1 },
  { id: 'ES-002', sigungu: '진주시', dong: '칠암동', station_name: '칠암동주민센터', building_name: '주민센터(1층)', address: '진주시 칠암로 22', d1_am_count: 1, d1_pm_count: 0, d2_am_count: 1, d2_pm_count: 1, slot_max: 1 },
  { id: 'ES-003', sigungu: '진주시', dong: '평거동', station_name: '평거동주민센터', building_name: '주민센터(2층)', address: '진주시 평거로 5', d1_am_count: 1, d1_pm_count: 1, d2_am_count: 1, d2_pm_count: 1, slot_max: 1 },
  { id: 'ES-004', sigungu: '김해시', dong: '내외동', station_name: '내외동주민센터', building_name: '주민센터(1층)', address: '김해시 내외로 33', d1_am_count: 0, d1_pm_count: 0, d2_am_count: 0, d2_pm_count: 0, slot_max: 1 },
  { id: 'ES-005', sigungu: '창원시', dong: '중앙동', station_name: '중앙동주민센터', building_name: '주민센터(1층)', address: '창원시 의창구 중앙대로 88', d1_am_count: 0, d1_pm_count: 1, d2_am_count: 0, d2_pm_count: 0, slot_max: 1 },
];

// === Mock 개표소 ===
const mockCountingStations: CountingStation[] = [
  { id: 'CS-001', sigungu: '진주시', station_name: '진주실내체육관', building_name: '진주실내체육관(지하1층)', address: '진주시 체육로 1', current_count: 2, max_count: 8 },
  { id: 'CS-002', sigungu: '김해시', station_name: '김해실내체육관', building_name: '김해체육관(1층)', address: '김해시 체육공원로 15', current_count: 6, max_count: 8 },
  { id: 'CS-003', sigungu: '창원시', station_name: '창원체육관', building_name: '창원컨벤션센터(3층)', address: '창원시 의창구 체육관로 5', current_count: 0, max_count: 8 },
];

// === Mock 당원명단 ===
const mockMembers = [
  { name: '김정의', birth_date: '19850315' },
  { name: '이평등', birth_date: '19900720' },
  { name: '박연대', birth_date: '19780101' },
];

export async function verifyMember(
  name: string,
  birthDate: string,
): Promise<MemberVerifyResponse> {
  const normalizedBirth = birthDate.replace(/[^0-9]/g, '');
  const found = mockMembers.some(
    m => m.name === name.trim() && m.birth_date === normalizedBirth,
  );
  return found
    ? { verified: true, message: '당원 인증이 완료되었습니다.' }
    : { verified: false, message: '당원 명단에서 확인되지 않습니다.' };
}

// === Mock 신청자 데이터 (메모리) ===
const mockApplications: Array<ApplicationRequest & { id: string; timestamp: string; status: string }> = [];
let appCounter = 0;

// === 유틸 ===
function addTypeToStation<T extends { type: ObservationType }>(stations: Omit<T, 'type'>[], type: ObservationType): T[] {
  return stations.map(s => ({ ...s, type }) as T);
}

// === 외부 함수 ===
export async function getConfig(): Promise<Config> {
  return { ...mockConfig };
}

export async function getCandidateInfo(): Promise<CandidateInfo[]> {
  return [...mockCandidates];
}

export async function getStations(type: ObservationType, sigungu?: string): Promise<Station[]> {
  let stations: Station[];
  switch (type) {
    case 'polling':
      stations = addTypeToStation<Station>(mockPollingStations, 'polling');
      break;
    case 'early':
      stations = addTypeToStation<Station>(mockEarlyStations, 'early');
      break;
    case 'counting':
      stations = addTypeToStation<Station>(mockCountingStations, 'counting');
      break;
  }
  if (sigungu) {
    stations = stations.filter(s => s.sigungu === sigungu);
  }
  return stations;
}

export async function getSigunguList(type: ObservationType): Promise<string[]> {
  const stations = await getStations(type);
  return [...new Set(stations.map(s => s.sigungu))].sort();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

function getDayGroup(timeSlot: string): string {
  if (timeSlot === 'am' || timeSlot === 'pm') return 'election_day';
  if (timeSlot === 'd1_am' || timeSlot === 'd1_pm') return 'early_d1';
  if (timeSlot === 'd2_am' || timeSlot === 'd2_pm') return 'early_d2';
  return 'counting_day';
}

export async function checkDuplicate(phone: string, timeSlot: string, type: string): Promise<{ duplicate: boolean; message: string }> {
  const normalized = normalizePhone(phone);
  const dayGroup = getDayGroup(timeSlot);

  // 같은 날 중복 체크
  const sameDayDup = mockApplications.some(
    a => a.type === type && normalizePhone(a.phone) === normalized && getDayGroup(a.time_slot) === dayGroup
  );
  if (sameDayDup) {
    return { duplicate: true, message: '같은 날에 이미 신청한 내역이 있습니다. 하루에 한 타임만 신청할 수 있습니다.' };
  }

  // 본투표 오후 ↔ 개표 크로스 체크
  if (type === 'counting') {
    const hasPollingPm = mockApplications.some(
      a => a.type === 'polling' && normalizePhone(a.phone) === normalized && a.time_slot === 'pm'
    );
    if (hasPollingPm) return { duplicate: true, message: '본투표 오후 참관인으로 신청되어 있어 개표 참관인을 신청할 수 없습니다.' };
  }
  if (type === 'polling' && timeSlot === 'pm') {
    const hasCounting = mockApplications.some(
      a => a.type === 'counting' && normalizePhone(a.phone) === normalized
    );
    if (hasCounting) return { duplicate: true, message: '개표 참관인으로 신청되어 있어 본투표 오후를 신청할 수 없습니다.' };
  }

  return { duplicate: false, message: '' };
}

export async function submitApplication(data: ApplicationRequest): Promise<{ success: boolean; id: string; status: string; message: string }> {
  const dupCheck = await checkDuplicate(data.phone, data.time_slot, data.type);
  if (dupCheck.duplicate) {
    return { success: false, id: '', status: '', message: dupCheck.message };
  }

  const config = await getConfig();
  const stations = await getStations(data.type);
  const station = stations.find(s => s.id === data.station_id);
  if (!station) {
    return { success: false, id: '', status: '', message: '투표소를 찾을 수 없습니다.' };
  }

  const isFull = isSlotFull(station, data.time_slot);
  if (isFull && !config.lottery_mode) {
    return { success: false, id: '', status: '', message: '해당 시간대의 정원이 마감되었습니다.' };
  }

  const status = isFull ? 'lottery' : 'applied';
  appCounter++;
  const id = `APP-${String(appCounter).padStart(3, '0')}`;

  mockApplications.push({
    ...data,
    id,
    timestamp: new Date().toISOString(),
    status,
  });

  if (status !== 'lottery') {
    incrementMockCount(station, data.time_slot);
  }

  const message = status === 'lottery'
    ? '추첨 신청이 완료되었습니다. 추후 결과를 안내드리겠습니다.'
    : '신청이 완료되었습니다.';

  return { success: true, id, status, message };
}

function isSlotFull(station: Station, timeSlot: string): boolean {
  switch (station.type) {
    case 'polling': {
      const s = station;
      if (timeSlot === 'am') return s.am_count >= s.am_max;
      if (timeSlot === 'pm') return s.pm_count >= s.pm_max;
      return false;
    }
    case 'early': {
      const s = station;
      const countKey = `${timeSlot}_count` as keyof typeof s;
      return (s[countKey] as number) >= s.slot_max;
    }
    case 'counting': {
      return station.current_count >= station.max_count;
    }
  }
}

function incrementMockCount(station: Station, timeSlot: string): void {
  switch (station.type) {
    case 'polling': {
      const s = mockPollingStations.find(ps => ps.id === station.id);
      if (!s) return;
      if (timeSlot === 'am') s.am_count++;
      if (timeSlot === 'pm') s.pm_count++;
      break;
    }
    case 'early': {
      const s = mockEarlyStations.find(es => es.id === station.id);
      if (!s) return;
      if (timeSlot === 'd1_am') s.d1_am_count++;
      if (timeSlot === 'd1_pm') s.d1_pm_count++;
      if (timeSlot === 'd2_am') s.d2_am_count++;
      if (timeSlot === 'd2_pm') s.d2_pm_count++;
      break;
    }
    case 'counting': {
      const s = mockCountingStations.find(cs => cs.id === station.id);
      if (s) s.current_count++;
      break;
    }
  }
}

// === 참관 보고 Mock ===
export async function submitVoterCountReport(
  data: VoterCountReport,
): Promise<{ success: boolean; message: string }> {
  console.log('[Mock] 투표인수 보고:', data);
  return { success: true, message: '투표인수가 보고되었습니다.' };
}

export async function submitIncidentReport(
  data: IncidentReport,
): Promise<{ success: boolean; message: string }> {
  console.log('[Mock] 특이사항 보고:', data);
  return { success: true, message: '특이사항이 보고되었습니다.' };
}
