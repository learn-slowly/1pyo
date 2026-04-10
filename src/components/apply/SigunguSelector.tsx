'use client';

interface Props {
  sigunguList: string[];
  selected: string | null;
  onSelect: (sigungu: string) => void;
  loading?: boolean;
}

export default function SigunguSelector({ sigunguList, selected, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">지역을 선택하세요</h2>
        <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">지역을 선택하세요</h2>
      <div className="grid gap-2">
        {sigunguList.map((sigungu) => (
          <button
            key={sigungu}
            onClick={() => onSelect(sigungu)}
            className={`p-3 rounded-lg border-2 text-left font-medium transition-all ${
              selected === sigungu
                ? 'border-yellow-400 bg-yellow-50 text-gray-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-yellow-300'
            }`}
          >
            {sigungu}
          </button>
        ))}
      </div>
    </div>
  );
}
