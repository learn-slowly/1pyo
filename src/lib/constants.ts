export const OBSERVATION_TYPES = {
  early: { label: '사전투표 참관', description: '사전투표일 이틀간' },
  polling: { label: '본투표 참관', description: '6월 3일 선거일 당일' },
  counting: { label: '개표 참관', description: '6월 3일 밤 개표' },
} as const;

export const TIME_SLOT_LABELS: Record<string, string> = {
  am: '오전',
  pm: '오후',
  d1_am: '1일차 오전',
  d1_pm: '1일차 오후',
  d2_am: '2일차 오전',
  d2_pm: '2일차 오후',
  all: '전체',
};

export const STATUS_LABELS: Record<string, string> = {
  applied: '신청완료',
  confirmed: '확인됨',
  lottery: '추첨대기',
  assigned: '배치완료',
};

export const JUNGUI_YELLOW = '#FFCC00';
