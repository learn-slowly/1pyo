'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Station } from '@/lib/types';
import { OBSERVATION_TYPES, TIME_SLOT_LABELS } from '@/lib/constants';

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          address: string;
          roadAddress: string;
          jibunAddress: string;
          buildingName: string;
          userSelectedType: string;
        }) => void;
      }) => { open: () => void };
    };
  }
}

interface ApplicantData {
  name: string;
  phone: string;
  birth_date: string;
  gender: '1' | '2';
  zip_code: string;
  address: string;
  address_detail: string;
  occupation: string;
  account: string;
}

interface Props {
  station: Station;
  timeSlot: string;
  isLottery: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (data: ApplicantData) => void;
}

function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatBirthDate(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 8);
}

export default function ApplicantInfoForm({ station, timeSlot, isLottery, isSubmitting, submitError, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'1' | '2' | ''>('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [account, setAccount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const addressDetailRef = useCallback((node: HTMLInputElement | null) => {
    if (node && address && !addressDetail) node.focus();
  }, [address, addressDetail]);

  // 카카오 우편번호 스크립트 로드
  useEffect(() => {
    if (document.getElementById('daum-postcode')) return;
    const script = document.createElement('script');
    script.id = 'daum-postcode';
    script.src = '//t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const openPostcode = useCallback(() => {
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete(data) {
        setZipCode(data.zonecode);
        const fullAddress = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
        const extra = data.buildingName ? ` (${data.buildingName})` : '';
        setAddress(fullAddress + extra);
        setAddressDetail('');
      },
    }).open();
  }, []);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = '이름을 2자 이상 입력해주세요';
    const digits = phone.replace(/[^0-9]/g, '');
    if (!/^01[016789]\d{7,8}$/.test(digits)) e.phone = '올바른 연락처를 입력해주세요';
    if (!/^\d{8}$/.test(birthDate)) e.birth_date = '생년월일 8자리를 입력해주세요';
    if (!gender) e.gender = '성별을 선택해주세요';
    if (address.trim().length < 2) e.address = '주소를 입력해주세요';
    if (occupation.trim().length < 1) e.occupation = '직업을 입력해주세요';
    if (account.trim().length < 2) e.account = '계좌번호를 입력해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, phone, birthDate, gender, address, occupation, account]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      phone,
      birth_date: birthDate,
      gender: gender as '1' | '2',
      zip_code: zipCode.trim(),
      address: address.trim(),
      address_detail: addressDetail.trim(),
      occupation: occupation.trim(),
      account: account.trim(),
    });
  };

  const inputClass = (field: string) =>
    `w-full p-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">신청 정보를 입력하세요</h2>

      {/* 선택 요약 */}
      <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
        <div className="text-gray-500">
          <span className="font-medium text-gray-700">{OBSERVATION_TYPES[station.type].label}</span>
          {' · '}{station.sigungu}
        </div>
        <div className="font-medium text-gray-900">{station.station_name}</div>
        <div className="text-gray-500">{TIME_SLOT_LABELS[timeSlot]}</div>
      </div>

      {/* 경고문 */}
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        문의는 문자로만 받습니다. 전화 문의 시 참관인 신청 내역이 무통보 삭제됩니다.
      </div>

      {isLottery && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          정원이 가득 찬 투표소입니다. 추첨 신청으로 접수됩니다.
        </div>
      )}

      {/* 이름 */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="홍길동" className={inputClass('name')} maxLength={20} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* 생년월일 + 성별 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">생년월일 *</label>
          <input id="birth_date" type="text" inputMode="numeric" value={birthDate}
            onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
            placeholder="19770514" className={inputClass('birth_date')} />
          {errors.birth_date && <p className="text-red-500 text-xs mt-1">{errors.birth_date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">성별 *</label>
          <div className="grid grid-cols-2 gap-2">
            {([['1', '남'], ['2', '여']] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setGender(val)}
                className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                  gender === val ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 hover:border-gray-400'
                }`}>{label}</button>
            ))}
          </div>
          {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
        </div>
      </div>

      {/* 연락처 */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
        <input id="phone" type="tel" inputMode="numeric" value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-1234-5678" className={inputClass('phone')} />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>

      {/* 주소 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">주소 *</label>
        <div className="flex gap-2 mb-2">
          <input id="zip_code" type="text" value={zipCode} readOnly
            placeholder="우편번호" className="w-24 p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900" />
          <button type="button" onClick={openPostcode}
            className="px-4 py-3 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap">
            주소 검색
          </button>
        </div>
        <input id="address" type="text" value={address} readOnly
          placeholder="주소 검색 버튼을 눌러주세요"
          className={`w-full p-3 border rounded-lg bg-gray-50 text-gray-900 mb-2 ${errors.address ? 'border-red-400' : 'border-gray-300'}`} />
        {errors.address && <p className="text-red-500 text-xs mb-2">{errors.address}</p>}
        <input id="address_detail" type="text" ref={addressDetailRef} value={addressDetail}
          onChange={(e) => setAddressDetail(e.target.value)}
          placeholder="상세주소 입력"
          className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
      </div>

      {/* 직업 + 계좌 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">직업 *</label>
          <input id="occupation" type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)}
            placeholder="회사원" className={inputClass('occupation')} maxLength={20} />
          {errors.occupation && <p className="text-red-500 text-xs mt-1">{errors.occupation}</p>}
        </div>
        <div>
          <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">계좌번호 *</label>
          <input id="account" type="text" value={account} onChange={(e) => setAccount(e.target.value)}
            placeholder="OO은행 11-111-11111" className={inputClass('account')} maxLength={40} />
          {errors.account && <p className="text-red-500 text-xs mt-1">{errors.account}</p>}
        </div>
      </div>

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
          {submitError}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}
        className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
          isSubmitting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500 active:bg-yellow-600'
        }`}>
        {isSubmitting ? '신청 중...' : isLottery ? '추첨 신청하기' : '신청하기'}
      </button>
    </form>
  );
}
