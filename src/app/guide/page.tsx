'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 퀴즈 데이터
const quizzes = [
  {
    q: '투표참관인은 투표소에서 유권자에게 특정 후보를 추천할 수 있다?',
    options: ['가능하다', '불가능하다'],
    answer: 1,
    explanation: '투표에 간섭하거나 투표를 권유하는 행위, 어떠한 방법으로든 선거에 영향을 미치는 행위는 금지됩니다.',
  },
  {
    q: '개표참관인이 개표 상황을 촬영할 수 있는 시점은?',
    options: ['사고가 발생했을 때만', '선관위 허가를 받았을 때', '언제든지 가능', '절대 불가'],
    answer: 2,
    explanation: '개표참관인은 개표소 안에서 개표상황을 언제든지 순회·감시 또는 촬영할 수 있습니다. (투표참관인은 사고 발생 시에만 촬영 가능)',
  },
  {
    q: '투표참관인 수당을 받으려면 최소 몇 시간 이상 출석해야 하는가?',
    options: ['3시간', '4시간', '6시간', '8시간'],
    answer: 2,
    explanation: '투표참관인은 6시간 이상 출석해야 수당(10만원)을 받을 수 있습니다.',
  },
  {
    q: '다음 중 투표참관인이 될 수 없는 사람은?',
    options: ['대학생', '자영업자', '후보자의 배우자', '퇴직 공무원'],
    answer: 2,
    explanation: '후보자 본인과 후보자의 배우자는 투표참관인이 될 수 없습니다.',
  },
  {
    q: '투표관리관이 유권자의 신분을 확인하지 않고 투표용지를 교부하는 것을 목격했다. 어떻게 해야 하는가?',
    options: ['모른 척 한다', '직접 유권자에게 신분증을 요구한다', '투표관리관에게 시정을 요구한다', '경찰에 신고한다'],
    answer: 2,
    explanation: '참관인은 법 위반 사실을 발견하면 시정을 요구할 수 있으며, 투표관리관은 정당한 요구를 시정해야 할 의무가 있습니다.',
  },
  {
    q: '투표참관인과 개표참관인의 촬영 권한 차이는?',
    options: ['둘 다 언제든 촬영 가능', '둘 다 촬영 불가', '투표참관인은 사고 시에만, 개표참관인은 언제든 가능', '투표참관인만 촬영 가능'],
    answer: 2,
    explanation: '투표소와 개표소의 촬영 규정이 다릅니다. 현장에서 가장 헷갈리기 쉬운 부분이니 꼭 기억하세요!',
  },
  {
    q: '개표참관인은 개표 내용을 몇 미터 이내에서 참관할 수 있는가?',
    options: ['3m~5m', '2m~3m', '1m~2m', '제한 없음'],
    answer: 2,
    explanation: '선관위는 개표참관인이 개표 내용을 식별할 수 있도록 1m 이상 2m 이내의 참관인석을 마련해야 합니다.',
  },
  {
    q: '다음 중 투표참관인이 될 수 없는 사람을 모두 고르시오.',
    options: ['통·리·반의 장', '읍·면·동 주민자치위원회 위원', '현직 공무원', 'A, B, C 모두'],
    answer: 3,
    explanation: '통·리·반장, 주민자치위원회 위원, 공무원 등 입후보 제한직에 있는 자는 모두 참관인이 될 수 없습니다.',
  },
  {
    q: '옆자리 참관인이 투표하러 온 유권자에게 말을 걸며 대화를 시도하고 있다. 어떻게 대응해야 하는가?',
    options: ['같이 대화에 참여한다', '무시한다', '투표관리관에게 알려 시정을 요구한다', '직접 제지한다'],
    answer: 2,
    explanation: '참관인이 유권자에게 말을 거는 것은 선거에 영향을 미치는 행위에 해당할 수 있습니다. 직접 제지하기보다 투표관리관에게 알려 시정을 요구하는 것이 올바른 대응입니다.',
  },
  {
    q: '개표참관인은 개표상황을 정당·후보자에게 통보할 수 있는가?',
    options: ['가능하다', '불가능하다'],
    answer: 0,
    explanation: '개표참관인은 선관위가 지정한 장소에 통신설비를 설치하고, 개표상황을 후보자 또는 정당에 통보할 수 있습니다. 이것이 참관인을 보내는 핵심적인 이유 중 하나입니다.',
  },
];

const STEP_TITLES = [
  '정의당에 투표할 수 있는 곳',
  '참관인이란 무엇인가',
  '투표참관인의 역할',
  '개표참관인의 역할',
  '실전 타임라인',
  '알아두면 좋은 것들',
  '퀴즈',
];

const TOTAL_STEPS = STEP_TITLES.length;

// === 각 섹션 컴포넌트 ===

function Step1() {
  return (
    <>
      <p className="text-sm text-gray-600 mb-4">6월 3일 지방선거, 경남에서 정의당에 투표할 수 있는 곳은 다음과 같습니다.</p>
      <div className="space-y-3">
        <div className="bg-white border rounded-xl p-4">
          <p className="font-semibold text-gray-900">경남도의회 비례대표</p>
          <p className="text-sm text-gray-500 mt-1">경남 전역 — 경남 어디에 살든, 도의회 비례대표에서 정의당을 선택할 수 있습니다.</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="font-semibold text-gray-900">창원시의회 비례대표</p>
          <p className="text-sm text-gray-500 mt-1">창원시 전역 — 창원시 유권자라면 시의회 비례대표에서도 정의당에 투표할 수 있습니다.</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="font-semibold text-gray-900">진주시의원 라선거구 — 김용국 후보</p>
          <p className="text-sm text-gray-500 mt-1">진주시 라선거구에서는 정의당 김용국 후보에게 직접 투표할 수 있습니다.</p>
          <div className="mt-3 bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-700 mb-1">라선거구 해당 지역</p>
            <p className="text-xs text-gray-500">천전동(망경, 강남, 주약, 칠암) · 가호동(가좌, 호탄) · 성북동(본성, 남성, 인사, 중안, 봉곡, 계동)</p>
          </div>
        </div>
      </div>
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700">
        이 소중한 표가 제대로 세어지려면, 우리 눈이 현장에 있어야 합니다.
        여러분은 정의당이 파견한, <strong>정의당의 한 표를 지키는 파수꾼</strong>입니다.
      </div>
    </>
  );
}

function Step2({ disqualifyConfirmed, onDisqualifyChange }: { disqualifyConfirmed: boolean; onDisqualifyChange: (v: boolean) => void }) {
  return (
    <>
      <h3 className="text-sm font-bold text-gray-700 mb-2">참관인의 종류</h3>
      <div className="overflow-x-auto border rounded-xl bg-white mb-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">종류</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">언제</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">어디서</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">근거</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-b"><td className="px-3 py-2">사전투표참관인</td><td className="px-3 py-2">선거일 전 5~4일 (2일간)</td><td className="px-3 py-2">사전투표소</td><td className="px-3 py-2">제162조</td></tr>
            <tr className="border-b"><td className="px-3 py-2">투표참관인</td><td className="px-3 py-2">선거 당일</td><td className="px-3 py-2">투표소</td><td className="px-3 py-2">제161조</td></tr>
            <tr><td className="px-3 py-2">개표참관인</td><td className="px-3 py-2">선거 당일 투표 종료 후</td><td className="px-3 py-2">개표소</td><td className="px-3 py-2">제181조</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-sm font-bold text-gray-700 mb-2">누가 참관인이 되나요?</h3>
      <p className="text-sm text-gray-600 mb-4">정의당이 후보자마다 투표소별 1인, 개표소별 최대 6인을 선정하여 선거관리위원회에 신고합니다. 즉, <strong>정당이 직접 보내는 사람</strong>입니다.</p>

      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
        <h3 className="text-sm font-bold text-red-600 mb-3">참관인이 될 수 없는 사람</h3>
        <p className="text-xs text-red-500 mb-3">아래에 해당하는 분은 참관인 신청이 불가합니다. 선관위에서 자격을 대조하며, 결격사유 발견 시 참관인 자격이 취소됩니다.</p>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex gap-2 items-start"><span className="text-red-500 shrink-0">&#10007;</span>대한민국 국민이 아닌 자</li>
          <li className="flex gap-2 items-start"><span className="text-red-500 shrink-0">&#10007;</span>미성년자</li>
          <li className="flex gap-2 items-start"><span className="text-red-500 shrink-0">&#10007;</span>선거권이 없는 자 (금고 이상의 형을 선고받고 집행 중인 자 등)</li>
          <li className="flex gap-2 items-start"><span className="text-red-500 shrink-0">&#10007;</span>공무원 등 입후보 제한직에 있는 자</li>
          <li className="flex gap-2 items-start"><span className="text-red-500 shrink-0">&#10007;</span>읍·면·동 주민자치위원회 위원, 통·리·반의 장</li>
          <li className="flex gap-2 items-start"><span className="text-red-500 shrink-0">&#10007;</span>후보자 본인 또는 후보자의 배우자</li>
        </ul>
        <label className="flex items-start gap-3 mt-4 pt-3 border-t border-red-200 cursor-pointer">
          <input
            type="checkbox"
            checked={disqualifyConfirmed}
            onChange={(e) => onDisqualifyChange(e.target.checked)}
            className="mt-0.5 rounded border-red-300 text-red-500 focus:ring-red-400"
          />
          <span className="text-sm font-medium text-gray-900">위 결격사유에 해당하지 않음을 확인합니다.</span>
        </label>
      </div>
    </>
  );
}

function Step3() {
  return (
    <>
      <h3 className="text-sm font-bold text-green-700 mb-2">할 수 있는 것</h3>
      <div className="space-y-2 mb-4">
        {[
          ['투표 개시 전', '투표함과 기표소 안팎의 이상 유무 검사 참관'],
          ['투표함 봉쇄·봉인', '투표관리관과 함께 봉쇄·봉인 과정 참여, 특수봉인지에 서명'],
          ['투표 진행 중', '선거인 본인 여부 확인 과정, 투표용지 교부 및 진행 상황 참관'],
          ['위법사항 시정 요구', '투표간섭·부정투표 등 법 위반 발견 시 시정 요구 가능'],
          ['사고 시 촬영', '투표소 안에서 사고 발생 시에 한하여 투표상황 촬영 가능'],
          ['투표 종료 후', '투표함 투입구 봉쇄·봉인 과정 참관 및 특수봉인지 서명'],
        ].map(([title, desc]) => (
          <div key={title} className="flex gap-3 items-start bg-green-50 rounded-lg p-3">
            <span className="text-green-600 mt-0.5 shrink-0">&#10003;</span>
            <div><p className="text-sm font-medium text-gray-900">{title}</p><p className="text-xs text-gray-600">{desc}</p></div>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-bold text-red-600 mb-2">하면 안 되는 것</h3>
      <div className="space-y-2">
        {[
          '투표에 간섭하거나 투표를 권유하는 행위',
          '어떠한 방법으로든 선거에 영향을 미치는 행위',
          '투표소 내 질서를 해치는 행위',
          '사고가 아닌 상황에서의 투표 촬영',
        ].map((text) => (
          <div key={text} className="flex gap-3 items-start bg-red-50 rounded-lg p-3">
            <span className="text-red-500 mt-0.5 shrink-0">&#10007;</span>
            <p className="text-sm text-gray-700">{text}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-red-500 font-medium">위반 시 공직선거법에 따라 처벌받을 수 있습니다.</p>
    </>
  );
}

function Step4() {
  return (
    <>
      <h3 className="text-sm font-bold text-green-700 mb-2">할 수 있는 것</h3>
      <div className="space-y-2 mb-4">
        {[
          ['투표함 인계·인수', '투표소에서 송부된 투표함의 인계·인수 절차 참관, 봉쇄·봉인 검사'],
          ['개표 순회 감시', '개표소 안에서 개표상황을 언제든지 순회·감시 가능'],
          ['촬영 가능', '개표상황을 언제든지 촬영 가능 (투표참관인과 다른 점!)'],
          ['통신 가능', '선관위가 지정한 장소에 통신설비를 설치하고 개표상황을 정당·후보자에게 통보 가능'],
          ['가까운 거리 참관', '개표 내용을 식별할 수 있는 1m~2m 이내에서 참관'],
          ['위법사항 시정 요구', '개표에 관한 위법사항 발견 시 시정 요구 가능'],
        ].map(([title, desc]) => (
          <div key={title} className="flex gap-3 items-start bg-green-50 rounded-lg p-3">
            <span className="text-green-600 mt-0.5 shrink-0">&#10003;</span>
            <div><p className="text-sm font-medium text-gray-900">{title}</p><p className="text-xs text-gray-600">{desc}</p></div>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-bold text-red-600 mb-2">하면 안 되는 것</h3>
      <div className="space-y-2">
        {[
          '개표사무 방해·지연 금지',
          '개표소 내 질서를 해치는 행위 금지',
        ].map((text) => (
          <div key={text} className="flex gap-3 items-start bg-red-50 rounded-lg p-3">
            <span className="text-red-500 mt-0.5 shrink-0">&#10007;</span>
            <p className="text-sm text-gray-700">{text}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Step5() {
  return (
    <>
      <h3 className="text-sm font-bold text-gray-700 mb-3">투표 당일 흐름 (투표참관인)</h3>
      <div className="relative pl-6 border-l-2 border-yellow-300 space-y-4 mb-6">
        {[
          ['05:30 이전', '투표소 도착, 신분 확인'],
          ['06:00', '투표함·기표소 이상 유무 검사 참관\n투표함 봉쇄·봉인 과정 참여, 특수봉인지 서명'],
          ['06:00~12:00', '오전조 — 투표 진행, 교부상황·투표상황 참관'],
          ['12:00', '오전조 ↔ 오후조 교대 (오후조 11:30 집합)'],
          ['12:00~18:00', '오후조 — 투표 진행, 교부상황·투표상황 참관'],
          ['18:00', '투표 마감\n투표함 투입구 봉쇄·봉인 과정 참관, 특수봉인지 서명'],
          ['마감 후', '투표소당 2명 투표함 이송 동행 (회송참관)'],
        ].map(([time, desc]) => (
          <div key={time} className="relative">
            <div className="absolute -left-[25px] w-3 h-3 rounded-full bg-yellow-400 border-2 border-white" />
            <p className="text-xs font-bold text-yellow-600">{time}</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{desc}</p>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-bold text-gray-700 mb-3">개표 흐름 (개표참관인)</h3>
      <div className="relative pl-6 border-l-2 border-yellow-300 space-y-4">
        {[
          ['투표함 도착', '투표함 인계·인수 절차 참관, 봉쇄·봉인 검사'],
          ['개표 시작', '투표함 개함'],
          ['진행 중', '투표지 분류 (분류기 사용)'],
          ['검열·공표', '후보자별 득표수 검열·공표'],
          ['확인', '개표상황표 확인'],
          ['개표 종료', '결과 최종 확인'],
        ].map(([time, desc]) => (
          <div key={time} className="relative">
            <div className="absolute -left-[25px] w-3 h-3 rounded-full bg-yellow-400 border-2 border-white" />
            <p className="text-xs font-bold text-yellow-600">{time}</p>
            <p className="text-sm text-gray-700">{desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-gray-700">
        개표는 보통 자정을 넘깁니다. 체력 관리가 중요해요!
      </div>
    </>
  );
}

function Step6() {
  return (
    <>
      <h3 className="text-sm font-bold text-gray-700 mb-2">수당</h3>
      <div className="overflow-x-auto border rounded-xl bg-white mb-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">구분</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">금액</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">비고</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-b"><td className="px-3 py-2">투표참관인</td><td className="px-3 py-2 font-semibold">10만원</td><td className="px-3 py-2">6시간 이상 출석 시 지급</td></tr>
            <tr className="border-b"><td className="px-3 py-2">개표참관인</td><td className="px-3 py-2 font-semibold">10만원</td><td className="px-3 py-2">자정 넘기면 20만원 (2일 계산)</td></tr>
            <tr><td className="px-3 py-2">식비</td><td className="px-3 py-2 font-semibold">별도</td><td className="px-3 py-2">정부예산 급식비 단가 기준</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-sm font-bold text-gray-700 mb-2">준비물 체크리스트</h3>
      <div className="bg-white border rounded-xl p-4 mb-4">
        <ChecklistItems />
      </div>

      <h3 className="text-sm font-bold text-gray-700 mb-2">투표소 안내</h3>
      <div className="bg-white border rounded-xl p-4 text-sm text-gray-600 space-y-1 mb-4">
        <p>현재 안내되는 투표소는 <strong>2025년 6월 대선 기준</strong>입니다.</p>
        <p>사전투표소: <strong>2026년 5월 19일</strong> 확정 예정</p>
        <p>본투표소: <strong>2026년 5월 24일</strong> 확정 예정</p>
        <p className="text-xs text-gray-400 mt-2">확정 후 투표소가 변경될 수 있으니, 배치 장소는 확정 공고 이후 다시 안내드리겠습니다.</p>
      </div>

      <h3 className="text-sm font-bold text-gray-700 mb-2">긴급 상황 연락처</h3>
      <div className="bg-white border rounded-xl p-4 text-sm text-gray-700 space-y-1 mb-4">
        <p>진주: <strong>010-5168-2404</strong> (문자만 가능)</p>
        <p>진주 외 경남 전역: <strong>010-5960-5190</strong> (문자만 가능)</p>
        <p className="text-xs text-red-400 mt-2">* 업무 폭주로 응대가 늦습니다. 불필요한 통화 시도시 신청 반려합니다.</p>
      </div>

      <h3 className="text-sm font-bold text-gray-700 mb-2">관련 법령</h3>
      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">조문</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">내용</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-b"><td className="px-3 py-2"><a href="https://www.law.go.kr/법령/공직선거법/제161조" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-700 underline">공직선거법 제161조</a></td><td className="px-3 py-2">투표참관</td></tr>
            <tr className="border-b"><td className="px-3 py-2"><a href="https://www.law.go.kr/법령/공직선거법/제162조" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-700 underline">공직선거법 제162조</a></td><td className="px-3 py-2">사전투표참관</td></tr>
            <tr><td className="px-3 py-2"><a href="https://www.law.go.kr/법령/공직선거법/제181조" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-700 underline">공직선거법 제181조</a></td><td className="px-3 py-2">개표참관</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function ChecklistItems() {
  const items = [
    '신분증',
    '편한 옷과 신발 (장시간 앉아 있어야 함)',
    '핸드폰 충전기 (긴 하루입니다)',
    '간식·물 (투표소 내 반입 가능 여부 사전 확인)',
    '필기도구 (메모용)',
    '정의당에서 제공하는 참관인 매뉴얼',
  ];
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <label key={i} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!checked[i]}
            onChange={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))}
            className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
          />
          <span className={`text-sm ${checked[i] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
            {item}
            {item.includes('참관인 매뉴얼') && (
              <a
                href="/참관인매뉴얼.pdf"
                download
                onClick={(e) => e.stopPropagation()}
                className="ml-2 text-yellow-600 hover:text-yellow-700 underline no-line-through"
              >
                다운로드
              </a>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

// === 퀴즈 스텝 (7단계) ===

function QuizStep({ onPass }: { onPass: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const score = quizzes.filter((q, i) => answers[i] === q.answer).length;
  const allAnswered = Object.keys(answers).length === quizzes.length;
  const perfect = showResults && score === quizzes.length;

  useEffect(() => {
    if (perfect) onPass();
  }, [perfect, onPass]);

  return (
    <>
      <div className="space-y-6">
        {quizzes.map((quiz, qIdx) => {
          const selected = answers[qIdx];
          const isCorrect = selected === quiz.answer;
          return (
            <div key={qIdx} className="bg-white border rounded-xl p-4">
              <p className="font-medium text-gray-900 mb-3">Q{qIdx + 1}. {quiz.q}</p>
              <div className="space-y-2">
                {quiz.options.map((opt, optIdx) => {
                  let style = 'border-gray-200 bg-white';
                  if (showResults) {
                    if (optIdx === quiz.answer) style = 'border-green-400 bg-green-50';
                    else if (selected === optIdx && !isCorrect) style = 'border-red-300 bg-red-50';
                  } else if (selected === optIdx) {
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
          {allAnswered ? '결과 확인하기' : `${Object.keys(answers).length}/${quizzes.length}문제 답변 완료`}
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

// === 메인 페이지 ===

const STEP_COMPONENTS = [Step1, () => null, Step3, Step4, Step5, Step6];

export default function GuidePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);
  const [disqualifyConfirmed, setDisqualifyConfirmed] = useState(false);

  // 이미 이수한 경우
  useEffect(() => {
    if (localStorage.getItem('guide_completed') === 'true') {
      setQuizPassed(true);
    }
  }, []);

  const isQuizStep = step === TOTAL_STEPS - 1;
  const StepContent = !isQuizStep ? STEP_COMPONENTS[step] : null;

  const handleQuizPass = () => {
    localStorage.setItem('guide_completed', 'true');
    setQuizPassed(true);
  };

  const goNext = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(s => s + 1);
  };

  const goPrev = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(s => s - 1);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 홈으로</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">투개표 참관인 교육자료</h1>
        <p className="text-sm text-gray-500 mt-1">2026한표</p>
      </div>

      {/* 진행 바 */}
      <div className="mb-6">
        <div className="flex items-center gap-1 mb-2">
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= step ? 'bg-yellow-400' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 text-center">
          {step + 1} / {TOTAL_STEPS} — {STEP_TITLES[step]}
        </p>
      </div>

      {/* 이미 이수한 경우 바로가기 */}
      {quizPassed && !isQuizStep && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm text-green-700">교육을 이수하셨습니다.</p>
          <button
            onClick={() => router.push('/apply')}
            className="text-sm font-bold text-yellow-600 hover:text-yellow-700"
          >
            바로 신청하기 →
          </button>
        </div>
      )}

      {/* 섹션 제목 */}
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-yellow-400">
        {step + 1}. {STEP_TITLES[step]}
      </h2>

      {/* 콘텐츠 */}
      {step === 1 ? (
        <Step2 disqualifyConfirmed={disqualifyConfirmed} onDisqualifyChange={setDisqualifyConfirmed} />
      ) : StepContent ? (
        <StepContent />
      ) : null}
      {isQuizStep && <QuizStep onPass={handleQuizPass} />}

      {/* 네비게이션 */}
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            onClick={goPrev}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            이전
          </button>
        )}
        {!isQuizStep ? (
          <button
            onClick={goNext}
            disabled={step === 1 && !disqualifyConfirmed}
            className="flex-1 py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            확인했습니다
          </button>
        ) : quizPassed ? (
          <button
            onClick={() => router.push('/apply')}
            className="flex-1 py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors"
          >
            참관인 신청하기
          </button>
        ) : null}
      </div>

      {/* 문의 안내 */}
      <div className="text-center text-xs text-gray-400 space-y-0.5 mt-8 mb-4">
        <p>진주: 010-5168-2404 (문자만 가능)</p>
        <p>진주 외 경남 전역: 010-5960-5190 (문자만 가능)</p>
        <p className="mt-1">* 업무 폭주로 응대가 늦습니다. 불필요한 통화 시도시 신청 반려합니다.</p>
      </div>
    </div>
  );
}
