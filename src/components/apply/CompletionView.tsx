'use client';

import type { ApplicationResponse, Station } from '@/lib/types';
import { OBSERVATION_TYPES, TIME_SLOT_LABELS } from '@/lib/constants';

interface Props {
  result: ApplicationResponse;
  station: Station;
  timeSlot: string;
  name: string;
  onReset: () => void;
}

export default function CompletionView({ result, station, timeSlot, name, onReset }: Props) {
  const isLottery = result.status === 'lottery';

  return (
    <div className="text-center space-y-6 py-8">
      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl ${
        isLottery ? 'bg-yellow-100' : 'bg-green-100'
      }`}>
        {isLottery ? '🎲' : '✓'}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {isLottery ? '추첨 신청이 완료되었습니다' : '신청이 완료되었습니다'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isLottery
            ? '추후 추첨 결과를 안내드리겠습니다.'
            : '참관인 신청이 접수되었습니다.'}
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 text-left">
        <div className="flex justify-between">
          <span className="text-gray-500">신청번호</span>
          <span className="font-mono font-medium text-gray-900">{result.application_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">신청자</span>
          <span className="text-gray-900">{name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">참관 유형</span>
          <span className="text-gray-900">{OBSERVATION_TYPES[station.type].label}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">투표소</span>
          <span className="text-gray-900">{station.station_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">시간대</span>
          <span className="text-gray-900">{TIME_SLOT_LABELS[timeSlot]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">상태</span>
          <span className={`font-medium ${isLottery ? 'text-yellow-600' : 'text-green-600'}`}>
            {isLottery ? '추첨대기' : '신청완료'}
          </span>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 rounded-lg border-2 border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition-all"
      >
        처음으로 돌아가기
      </button>
    </div>
  );
}
