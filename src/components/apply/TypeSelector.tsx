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
      <div className="grid gap-3">
        {(Object.entries(OBSERVATION_TYPES) as [ObservationType, typeof OBSERVATION_TYPES[ObservationType]][]).map(
          ([type, info]) => {
            const isSelected = selected === type;
            return (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 bg-white hover:border-yellow-300'
                }`}
              >
                <span className="text-3xl">{TYPE_ICONS[type]}</span>
                <div>
                  <div className="font-semibold text-gray-900">{info.label}</div>
                  <div className="text-sm text-gray-500">{info.description}</div>
                </div>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
