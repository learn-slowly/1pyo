// === 참관 유형 ===
export type ObservationType = 'early' | 'polling' | 'counting';

// === 시간대 ===
export type PollingTimeSlot = 'am' | 'pm';
export type EarlyTimeSlot = 'd1_am' | 'd1_pm' | 'd2_am' | 'd2_pm';
export type CountingTimeSlot = 'all';
export type TimeSlot = PollingTimeSlot | EarlyTimeSlot | CountingTimeSlot;

// === 투표소 데이터 ===
export interface PollingStation {
  id: string;
  sigungu: string;
  electorate: string;
  station_name: string;
  building_name: string;
  address: string;
  am_count: number;
  pm_count: number;
  am_max: number;
  pm_max: number;
}

export interface EarlyStation {
  id: string;
  sigungu: string;
  dong: string;
  station_name: string;
  building_name: string;
  address: string;
  d1_am_count: number;
  d1_pm_count: number;
  d2_am_count: number;
  d2_pm_count: number;
  slot_max: number;
}

export interface CountingStation {
  id: string;
  sigungu: string;
  station_name: string;
  building_name: string;
  address: string;
  current_count: number;
  max_count: number;
}

export type Station =
  | (PollingStation & { type: 'polling' })
  | (EarlyStation & { type: 'early' })
  | (CountingStation & { type: 'counting' });

// === 당원 인증 ===
export type MemberType = 'member' | 'acquaintance'; // 당원 | 당원지인

export interface MemberVerification {
  member_type: MemberType;
  // 당원지인인 경우 소개 당원 정보
  referrer_name?: string;
  referrer_birth_date?: string;
}

export interface MemberVerifyRequest {
  name: string;
  birth_date: string;
}

export interface MemberVerifyResponse {
  verified: boolean;
  message: string;
}

// === 신청 ===
export interface ApplicationRequest {
  name: string;
  phone: string;
  birth_date: string;   // YYYYMMDD
  gender: '1' | '2';    // 1=남, 2=여
  zip_code: string;
  address: string;
  address_detail: string;
  occupation: string;
  account: string;       // 계좌번호 (예: OO은행 11-111-11111)
  type: ObservationType;
  station_id: string;
  station_name: string;
  sigungu: string;
  time_slot: string;
  // 당원 인증 정보 (members_only 모드)
  member_verification?: MemberVerification;
}

export interface ApplicationResponse {
  success: boolean;
  message: string;
  application_id?: string;
  status?: 'applied' | 'lottery';
}

// === 설정 ===
export interface ContactInfo {
  label: string;
  number: string;
}

export interface CandidateInfo {
  title: string;
  description: string;
  detail_label?: string;
  detail_content?: string;
}

export interface Config {
  mode: 'members_only' | 'public';
  password?: string;
  lottery_mode: boolean;
  sido: string;
  region_name: string;
  contacts: ContactInfo[];
  contact_notice: string;
  guide_intro: string;
  guide_outro: string;
}

// === 참관 보고 ===
export interface VoterCountReport {
  reporter_name: string;
  reporter_phone: string;
  observation_type: 'early' | 'polling';
  station_name: string;
  sigungu: string;
  report_hour: string;       // "09", "10", ... "18" 또는 직접입력
  cumulative_voters: number;
}

export interface IncidentReport {
  reporter_name: string;
  reporter_phone: string;
  observation_type: ObservationType;
  station_name: string;
  sigungu: string;
  incident_type: string;     // 대리투표 의심, 봉인 훼손, 절차 위반, 참관 제한, 기타
  description: string;
  objection_filed: boolean;
  objection_result: string;
}

// === API 응답 ===
export interface StationsResponse {
  stations: Station[];
  sigunguList: string[];
  config: Config;
}

// === 폼 상태 ===
export type FormStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface FormState {
  step: FormStep;
  observationType: ObservationType | null;
  sigungu: string | null;
  selectedStation: Station | null;
  timeSlot: string | null;
  name: string;
  phone: string;
  isSubmitting: boolean;
  error: string | null;
  result: ApplicationResponse | null;
  // 당원 인증
  memberVerification: MemberVerification | null;
  memberVerified: boolean;
}
