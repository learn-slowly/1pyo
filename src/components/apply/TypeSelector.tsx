'use client';

import { ObservationType } from '@/lib/types';
import { OBSERVATION_TYPES } from '@/lib/constants';

const TYPE_ICONS: Record<ObservationType, string> = {
  early: '🗳️',
  polling: '✅',
  counting: '📊',
};

interface Props {
  selected: ObservationType | null;
  onSelect: (type: ObservationType) => void;
}

export default function TypeSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">참관 유형을 선택하세요</h2>
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 space-y-1">
        <p>· 투표 참관은 하루에 오전 또는 오후 중 <strong className="text-gray-900">1타임만</strong> 신청 가능합니다.</p>
        <p>· 본투표 오후 참관인과 개표 참관인은 <strong className="text-gray-900">동시 신청이 불가</strong>합니다.</p>
      </div>
      <div className="grid gap-3">
        {(Object.entries(OBSERVATION_TYPES) as [ObservationType, typeof OBSERVATION_TYPES[ObservationType]][]).map(
          ([type, info]) => {
            const isSelected = selected === type;
            const isDisabled = type === 'early' || type === 'counting';
            return (
              <button
                key={type}
                onClick={() => !isDisabled && onSelect(type)}
                disabled={isDisabled}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  isDisabled
                    ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                    : isSelected
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-200 bg-white hover:border-yellow-300'
                }`}
              >
                <span className="text-3xl">{TYPE_ICONS[type]}</span>
                <div>
                  <div className="font-semibold text-gray-900">{info.label}</div>
                  <div className="text-sm text-gray-500">{info.description}</div>
                  {type === 'early' && (
                    <div className="text-xs text-orange-600 mt-1">
                      5/15 후보등록 이후 모집 여부를 검토하여 안내드립니다. 선관위 추첨이 필요할 수 있습니다.
                    </div>
                  )}
                  {type === 'counting' && (
                    <div className="text-xs text-orange-600 mt-1">
                      개표참관인은 별도 모집합니다. 담당자에게 문의해주세요.
                    </div>
                  )}
                </div>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
