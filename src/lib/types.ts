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
}

export interface ApplicationResponse {
  success: boolean;
  message: string;
  application_id?: string;
  status?: 'applied' | 'lottery';
}

// === 설정 ===
export interface Config {
  mode: 'members_only' | 'public';
  password?: string;
  lottery_mode: boolean;
  sido: string;
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
}
