'use client';

import { useReducer, useCallback, useEffect, useState } from 'react';
import type { FormState, ObservationType, Station, StationsResponse, ApplicationResponse } from '@/lib/types';
import TypeSelector from './TypeSelector';
import SigunguSelector from './SigunguSelector';
import StationList from './StationList';
import TimeSlotSelector from './TimeSlotSelector';
import ApplicantInfoForm from './ApplicantInfoForm';
import CompletionView from './CompletionView';

type Action =
  | { type: 'SELECT_TYPE'; payload: ObservationType }
  | { type: 'SELECT_SIGUNGU'; payload: string }
  | { type: 'SELECT_STATION'; payload: Station }
  | { type: 'SELECT_TIMESLOT'; payload: string }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_RESULT'; payload: ApplicationResponse }
  | { type: 'GO_BACK' }
  | { type: 'RESET' };

const initialState: FormState = {
  step: 1,
  observationType: null,
  sigungu: null,
  selectedStation: null,
  timeSlot: null,
  name: '',
  phone: '',
  isSubmitting: false,
  error: null,
  result: null,
};

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'SELECT_TYPE':
      return { ...initialState, step: 2, observationType: action.payload };
    case 'SELECT_SIGUNGU':
      return { ...state, step: 3, sigungu: action.payload, selectedStation: null, timeSlot: null };
    case 'SELECT_STATION':
      return { ...state, step: 4, selectedStation: action.payload, timeSlot: null };
    case 'SELECT_TIMESLOT':
      return { ...state, step: 5, timeSlot: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isSubmitting: false };
    case 'SET_RESULT':
      return { ...state, step: 6, result: action.payload, isSubmitting: false };
    case 'GO_BACK':
      if (state.step <= 1) return state;
      const prevStep = (state.step - 1) as FormState['step'];
      const cleared: Partial<FormState> = {};
      if (prevStep < 5) { cleared.name = ''; cleared.phone = ''; }
      if (prevStep < 4) cleared.timeSlot = null;
      if (prevStep < 3) cleared.selectedStation = null;
      if (prevStep < 2) cleared.sigungu = null;
      return { ...state, ...cleared, step: prevStep, error: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

function isSlotFullForStation(station: Station, timeSlot: string): boolean {
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

export default function ApplyForm() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [stationsData, setStationsData] = useState<StationsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // 투표소 데이터 가져오기
  useEffect(() => {
    if (!state.observationType) return;

    setLoading(true);
    const params = new URLSearchParams({ type: state.observationType });
    if (state.sigungu) params.set('sigungu', state.sigungu);

    fetch(`/api/stations?${params}`)
      .then(res => res.json())
      .then(data => setStationsData(data))
      .catch(() => dispatch({ type: 'SET_ERROR', payload: '데이터를 불러오지 못했습니다.' }))
      .finally(() => setLoading(false));
  }, [state.observationType, state.sigungu]);

  const handleSubmit = useCallback(async (applicant: {
    name: string; phone: string; birth_date: string; gender: '1' | '2';
    zip_code: string; address: string; address_detail: string; occupation: string; account: string;
  }) => {
    if (!state.selectedStation || !state.timeSlot || !state.observationType || !state.sigungu) return;

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...applicant,
          type: state.observationType,
          station_id: state.selectedStation.id,
          station_name: state.selectedStation.station_name,
          sigungu: state.sigungu,
          time_slot: state.timeSlot,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        dispatch({ type: 'SET_ERROR', payload: result.message || '신청에 실패했습니다.' });
        return;
      }

      dispatch({
        type: 'SET_RESULT',
        payload: {
          success: true,
          message: result.message,
          application_id: result.id,
          status: result.status,
        },
      });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '네트워크 오류가 발생했습니다.' });
    }
  }, [state.selectedStation, state.timeSlot, state.observationType, state.sigungu]);

  const lotteryMode = stationsData?.config.lottery_mode ?? false;

  const stepLabels = ['유형 선택', '지역 선택', '투표소 선택', '시간대 선택', '정보 입력'];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">참관인 신청</h1>
        <p className="text-sm text-gray-500 mt-1">2026한표</p>
      </div>

      {/* 진행 단계 */}
      {state.step < 6 && (
        <div className="mb-6">
          <div className="flex items-center gap-1 mb-2">
            {stepLabels.map((label, i) => {
              const stepNum = i + 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full h-1.5 rounded-full ${
                      stepNum <= state.step ? 'bg-yellow-400' : 'bg-gray-200'
                    }`}
                  />
                  <span className={`text-[10px] mt-1 ${
                    stepNum === state.step ? 'text-yellow-600 font-medium' : 'text-gray-400'
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 뒤로가기 */}
      {state.step > 1 && state.step < 6 && (
        <button
          onClick={() => dispatch({ type: 'GO_BACK' })}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <span>←</span> 이전 단계
        </button>
      )}

      {/* 에러 (step 5는 폼 내부에서 표시) */}
      {state.error && state.step !== 5 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* 단계별 렌더링 */}
      {state.step === 1 && (
        <TypeSelector
          selected={state.observationType}
          onSelect={(type) => dispatch({ type: 'SELECT_TYPE', payload: type })}
        />
      )}

      {state.step === 2 && stationsData && (
        <SigunguSelector
          sigunguList={stationsData.sigunguList}
          selected={state.sigungu}
          onSelect={(sigungu) => dispatch({ type: 'SELECT_SIGUNGU', payload: sigungu })}
          loading={loading}
        />
      )}

      {state.step === 3 && stationsData && (
        <StationList
          stations={stationsData.stations}
          lotteryMode={lotteryMode}
          selectedStation={state.selectedStation}
          onSelect={(station) => dispatch({ type: 'SELECT_STATION', payload: station })}
          loading={loading}
        />
      )}

      {state.step === 4 && state.selectedStation && (
        <TimeSlotSelector
          station={state.selectedStation}
          lotteryMode={lotteryMode}
          selected={state.timeSlot}
          onSelect={(slot) => dispatch({ type: 'SELECT_TIMESLOT', payload: slot })}
        />
      )}

      {state.step === 5 && state.selectedStation && state.timeSlot && (
        <ApplicantInfoForm
          station={state.selectedStation}
          timeSlot={state.timeSlot}
          isLottery={isSlotFullForStation(state.selectedStation, state.timeSlot)}
          isSubmitting={state.isSubmitting}
          submitError={state.error}
          onSubmit={handleSubmit}
        />
      )}

      {state.step === 6 && state.result && state.selectedStation && state.timeSlot && (
        <CompletionView
          result={state.result}
          station={state.selectedStation}
          timeSlot={state.timeSlot}
          name={state.name}
          onReset={() => dispatch({ type: 'RESET' })}
        />
      )}

      {/* 로딩 (step 2에서 데이터 로딩 중) */}
      {state.step === 2 && loading && !stationsData && (
        <SigunguSelector sigunguList={[]} selected={null} onSelect={() => {}} loading />
      )}

      {/* 문의 안내 */}
      {state.step < 6 && (
        <div className="mt-6 text-center text-xs text-gray-400 space-y-0.5">
          <p>문의: 010-5960-5190 (문자만 가능, 전화 연결 시 신청 반려)</p>
          <p>진주지역: 010-5168-2404</p>
        </div>
      )}
    </div>
  );
}
