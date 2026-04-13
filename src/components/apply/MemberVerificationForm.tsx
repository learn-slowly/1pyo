'use client';

import { useState, useCallback } from 'react';
import type { MemberVerification } from '@/lib/types';

interface Props {
  onVerified: (verification: MemberVerification, verifiedName?: string, verifiedBirthDate?: string) => void;
}

function formatBirthDate(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 8);
}

export default function MemberVerificationForm({ onVerified }: Props) {
  // 본인 인증
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 당원지인 모드
  const [isAcquaintanceMode, setIsAcquaintanceMode] = useState(false);
  const [referrerName, setReferrerName] = useState('');
  const [referrerBirthDate, setReferrerBirthDate] = useState('');
  const [referrerVerifying, setReferrerVerifying] = useState(false);
  const [referrerError, setReferrerError] = useState<string | null>(null);

  const verifyMember = useCallback(async () => {
    if (name.trim().length < 2) {
      setError('이름을 2자 이상 입력해주세요');
      return;
    }
    if (!/^\d{8}$/.test(birthDate)) {
      setError('생년월일 8자리를 입력해주세요');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const res = await fetch('/api/verify-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), birth_date: birthDate }),
      });
      const data = await res.json();

      if (data.verified) {
        onVerified(
          { member_type: 'member' },
          name.trim(),
          birthDate,
        );
      } else {
        setError('당원 명단에서 확인되지 않습니다. 당원이 아닌 경우 아래 "당원 지인으로 신청"을 눌러주세요.');
      }
    } catch {
      setError('인증 처리 중 오류가 발생했습니다.');
    } finally {
      setVerifying(false);
    }
  }, [name, birthDate, onVerified]);

  const verifyReferrer = useCallback(async () => {
    if (referrerName.trim().length < 2) {
      setReferrerError('당원 이름을 2자 이상 입력해주세요');
      return;
    }
    if (!/^\d{8}$/.test(referrerBirthDate)) {
      setReferrerError('생년월일 8자리를 입력해주세요');
      return;
    }

    setReferrerVerifying(true);
    setReferrerError(null);

    try {
      const res = await fetch('/api/verify-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: referrerName.trim(), birth_date: referrerBirthDate }),
      });
      const data = await res.json();

      if (data.verified) {
        onVerified({
          member_type: 'acquaintance',
          referrer_name: referrerName.trim(),
          referrer_birth_date: referrerBirthDate,
        });
      } else {
        setReferrerError('해당 당원 정보를 확인할 수 없습니다. 이름과 생년월일을 다시 확인해주세요.');
      }
    } catch {
      setReferrerError('인증 처리 중 오류가 발생했습니다.');
    } finally {
      setReferrerVerifying(false);
    }
  }, [referrerName, referrerBirthDate, onVerified]);

  const inputClass = (hasError: boolean) =>
    `w-full p-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">당원 인증</h2>
      <p className="text-sm text-gray-600">
        현재 당원 전용 모드입니다. 당원 또는 당원 지인만 참관인 신청이 가능합니다.
      </p>

      {/* 본인 당원 인증 */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
        <h3 className="font-medium text-gray-900">본인 당원 인증</h3>
        <p className="text-xs text-gray-500">당원인 경우 본인의 이름과 생년월일을 입력해주세요.</p>

        <div>
          <label htmlFor="member-name" className="block text-sm font-medium text-gray-700 mb-1">이름</label>
          <input
            id="member-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className={inputClass(false)}
            maxLength={20}
            disabled={isAcquaintanceMode}
          />
        </div>

        <div>
          <label htmlFor="member-birth" className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
          <input
            id="member-birth"
            type="text"
            inputMode="numeric"
            value={birthDate}
            onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
            placeholder="19770514"
            className={inputClass(false)}
            disabled={isAcquaintanceMode}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="button"
          onClick={verifyMember}
          disabled={verifying || isAcquaintanceMode}
          className={`w-full py-3 rounded-lg font-bold transition-all ${
            verifying || isAcquaintanceMode
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'
          }`}
        >
          {verifying ? '인증 중...' : '당원 인증하기'}
        </button>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">또는</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* 당원 지인 인증 */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">당원 지인으로 신청</h3>
          {!isAcquaintanceMode && (
            <button
              type="button"
              onClick={() => { setIsAcquaintanceMode(true); setError(null); }}
              className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
            >
              선택
            </button>
          )}
        </div>

        {isAcquaintanceMode ? (
          <>
            <p className="text-xs text-gray-500">소개해주는 당원의 이름과 생년월일을 입력해주세요.</p>

            <div>
              <label htmlFor="referrer-name" className="block text-sm font-medium text-gray-700 mb-1">당원 이름</label>
              <input
                id="referrer-name"
                type="text"
                value={referrerName}
                onChange={(e) => setReferrerName(e.target.value)}
                placeholder="소개 당원 이름"
                className={inputClass(false)}
                maxLength={20}
              />
            </div>

            <div>
              <label htmlFor="referrer-birth" className="block text-sm font-medium text-gray-700 mb-1">당원 생년월일</label>
              <input
                id="referrer-birth"
                type="text"
                inputMode="numeric"
                value={referrerBirthDate}
                onChange={(e) => setReferrerBirthDate(formatBirthDate(e.target.value))}
                placeholder="19770514"
                className={inputClass(false)}
              />
            </div>

            {referrerError && (
              <p className="text-sm text-red-600">{referrerError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAcquaintanceMode(false);
                  setReferrerName('');
                  setReferrerBirthDate('');
                  setReferrerError(null);
                }}
                className="flex-1 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={verifyReferrer}
                disabled={referrerVerifying}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                  referrerVerifying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'
                }`}
              >
                {referrerVerifying ? '인증 중...' : '당원 지인 인증하기'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">
            당원이 아닌 경우, 소개해주는 당원의 정보로 인증할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}
