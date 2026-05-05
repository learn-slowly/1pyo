'use client';

import { useState, useEffect } from 'react';

export type Quiz = {
  q: string;
  options: string[];
  answer: number[];
  multi?: boolean;
  explanation: string;
};

export const quizzes: Quiz[] = [
  {
    q: '다음 중 투표참관인이 될 수 없는 사람을 모두 고르시오.',
    options: ['통·리·반의 장', '읍·면·동 주민자치위원회 위원', '현직 공무원', '퇴직 공무원'],
    answer: [0, 1, 2],
    multi: true,
    explanation: '통·리·반장, 주민자치위원회 위원, 현직 공무원 등 입후보 제한직에 있는 자는 참관인이 될 수 없습니다. 퇴직 공무원은 참관인이 될 수 있습니다.',
  },
  {
    q: '투표참관인 수당을 받으려면 최소 몇 시간 이상 출석해야 하는가?',
    options: ['3시간', '4시간', '6시간', '8시간'],
    answer: [2],
    explanation: '투표참관인은 6시간 이상 출석해야 수당(10만원)을 받을 수 있습니다.',
  },
  {
    q: '투표 개시 전 투표참관인이 가장 먼저 확인해야 할 것은?',
    options: ['자신의 좌석 위치', '투표용지에 인쇄된 후보 이름', '투표함이 비어 있는지와 봉인 상태', '선거인 명부의 이름 순서'],
    answer: [2],
    explanation: '투표 시작 전 참관인은 투표함이 비어 있는지 직접 확인하고 봉인을 함께 점검합니다. 부정 투입을 막기 위한 가장 중요한 절차이고, 참관인이 없으면 이 검증 자체가 성립하지 않습니다.',
  },
  {
    q: '투표관리관이 유권자의 신분을 확인하지 않고 투표용지를 교부하는 것을 목격했다. 어떻게 해야 하는가?',
    options: ['모른 척 한다', '직접 유권자에게 신분증을 요구한다', '투표관리관에게 시정을 요구한다', '경찰에 신고한다'],
    answer: [2],
    explanation: '참관인은 법 위반 사실을 발견하면 시정을 요구할 수 있으며, 투표관리관은 정당한 요구를 시정해야 할 의무가 있습니다.',
  },
  {
    q: '지방선거 당일 받는 비례대표 정당투표 용지의 특징은?',
    options: ['후보자 이름이 적혀 있다', '정당 이름과 기호만 적혀 있다 (사람 이름 없음)', '지역구와 한 장에 같이 표시한다', '색깔이 따로 없다'],
    answer: [1],
    explanation: '비례 투표용지에는 정당명만 나오므로 정의당 칸에 기표하시면 됩니다. 지방선거 당일 받는 용지가 7~8장이라 헷갈리기 쉬우니, 비례용지가 나오면 꼭 정의당을 찾아주세요.',
  },
  {
    q: '이번에 정의당 후보가 나온 지역을 모두 골라주세요.',
    options: ['경상남도 비례', '진주시 지역구 (천전·가호·성북)', '거제시 비례', '창원시 비례'],
    answer: [0, 1, 3],
    multi: true,
    explanation: '정의당은 경상남도 광역의회 비례, 창원시 기초의회 비례 두 곳에 비례 후보를 냈고, 진주시 라선거구(천전·가호·성북)에는 김용국 지역구 후보가 출마했습니다. 거제시에는 후보를 내지 않았습니다.',
  },
  {
    q: '창원에 사는 경남도민이 정의당에 투표할 수 있는 곳은?',
    options: ['경상남도의원 비례대표 선거', '김해시의원 지역구 선거', '진주시의원 지역구 선거', '창원시의원 비례대표 선거'],
    answer: [0, 3],
    multi: true,
    explanation: '경상남도의회 비례는 경남 어디에 사셔도 투표 가능하고, 창원시의회 비례는 창원 거주자가 투표할 수 있습니다. 김해·진주 지역구 선거는 해당 지역 거주자만 참여하므로 창원 거주자는 투표할 수 없습니다. 창원에 사신다면 도의회 비례 + 시의회 비례 두 곳에서 정의당을 선택해 주세요.',
  },
];

export function isAnswerCorrect(quiz: Quiz, selected: number[]): boolean {
  if (selected.length !== quiz.answer.length) return false;
  const sel = [...selected].sort((a, b) => a - b);
  const ans = [...quiz.answer].sort((a, b) => a - b);
  return sel.every((v, i) => v === ans[i]);
}

export default function QuizStep({ onPass }: { onPass: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [showResults, setShowResults] = useState(false);

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (showResults) return;
    const quiz = quizzes[qIdx];
    setAnswers(prev => {
      const current = prev[qIdx] || [];
      if (quiz.multi) {
        const next = current.includes(optIdx)
          ? current.filter(i => i !== optIdx)
          : [...current, optIdx];
        return { ...prev, [qIdx]: next };
      }
      return { ...prev, [qIdx]: [optIdx] };
    });
  };

  const score = quizzes.filter((q, i) => isAnswerCorrect(q, answers[i] || [])).length;
  const answeredCount = quizzes.filter((_, i) => (answers[i] || []).length > 0).length;
  const allAnswered = answeredCount === quizzes.length;
  const perfect = showResults && score === quizzes.length;

  useEffect(() => {
    if (perfect) onPass();
  }, [perfect, onPass]);

  return (
    <>
      <div className="space-y-6">
        {quizzes.map((quiz, qIdx) => {
          const selected = answers[qIdx] || [];
          const isCorrect = isAnswerCorrect(quiz, selected);
          return (
            <div key={qIdx} className="bg-white border rounded-xl p-4">
              <div className="flex items-start gap-2 mb-3">
                <p className="font-medium text-gray-900 flex-1">Q{qIdx + 1}. {quiz.q}</p>
                {quiz.multi && (
                  <span className="shrink-0 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-full px-2 py-0.5">
                    복수 선택
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {quiz.options.map((opt, optIdx) => {
                  const isOptionSelected = selected.includes(optIdx);
                  const isOptionCorrect = quiz.answer.includes(optIdx);
                  let style = 'border-gray-200 bg-white';
                  if (showResults) {
                    if (isOptionCorrect) style = 'border-green-400 bg-green-50';
                    else if (isOptionSelected) style = 'border-red-300 bg-red-50';
                  } else if (isOptionSelected) {
                    style = 'border-yellow-400 bg-yellow-50';
                  }
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border-2 text-sm transition-colors ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {showResults && (
                <p className={`mt-3 text-sm ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                  {isCorrect ? '정답!' : '오답.'} {quiz.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!showResults ? (
        <button
          onClick={() => allAnswered && setShowResults(true)}
          disabled={!allAnswered}
          className="w-full mt-6 py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {allAnswered ? '결과 확인하기' : `${answeredCount}/${quizzes.length}문제 답변 완료`}
        </button>
      ) : perfect ? (
        <div className="mt-6 text-center">
          <div className="inline-block bg-white border-2 border-green-400 rounded-xl px-8 py-5">
            <p className="text-sm text-gray-500 mb-1">내 점수</p>
            <p className="text-3xl font-bold text-green-600">{score}<span className="text-lg text-gray-400">/{quizzes.length}</span></p>
            <p className="text-sm mt-2 text-gray-600">완벽합니다! 현장에서도 빛날 거예요.</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 text-center">
          <div className="inline-block bg-white border-2 border-red-300 rounded-xl px-8 py-5">
            <p className="text-sm text-gray-500 mb-1">내 점수</p>
            <p className="text-3xl font-bold text-red-600">{score}<span className="text-lg text-gray-400">/{quizzes.length}</span></p>
            <p className="text-sm mt-2 text-gray-600">모든 문제를 맞춰야 신청할 수 있습니다.</p>
          </div>
          <button
            onClick={() => { setAnswers({}); setShowResults(false); }}
            className="block w-full mt-4 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            다시 풀기
          </button>
        </div>
      )}
    </>
  );
}
