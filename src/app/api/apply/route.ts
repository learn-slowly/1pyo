import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitApplication, getConfig, verifyMember, isSigunguBlockedForPublic } from '@/lib/sheets';

const memberVerificationSchema = z.object({
  member_type: z.enum(['member', 'acquaintance']),
  referrer_name: z.string().optional(),
  referrer_birth_date: z.string().optional(),
}).optional();

const applySchema = z.object({
  name: z.string().min(2, '이름은 2자 이상 입력해주세요').max(20),
  phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '올바른 연락처를 입력해주세요'),
  birth_date: z.string().regex(/^\d{8}$/, '생년월일 8자리를 입력해주세요'),
  gender: z.enum(['1', '2'], { message: '성별을 선택해주세요' }),
  zip_code: z.string().max(5).optional().default(''),
  address: z.string().min(2, '주소를 입력해주세요'),
  address_detail: z.string().optional().default(''),
  occupation: z.string().min(1, '직업을 입력해주세요').max(20),
  account: z.string().min(2, '계좌번호를 입력해주세요').max(40),
  type: z.enum(['early', 'polling', 'counting']),
  station_id: z.string().min(1),
  station_name: z.string().min(1),
  sigungu: z.string().min(1),
  time_slot: z.string().min(1),
  member_verification: memberVerificationSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = applySchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, message: firstError.message },
        { status: 400 }
      );
    }

    // members_only 모드일 때 서버 측 당원 인증 재확인
    const config = await getConfig();

    // 일반 이용자에게 차단된 시군구는 신청 거부 (관리자·모집책은 별도 엔드포인트 사용)
    if (isSigunguBlockedForPublic(parsed.data.sigungu, config.blocked_sigungu_public)) {
      return NextResponse.json(
        { success: false, message: '해당 시간대의 정원이 마감되었습니다.' },
        { status: 410 },
      );
    }

    if (config.mode === 'members_only') {
      const mv = parsed.data.member_verification;
      if (!mv) {
        return NextResponse.json(
          { success: false, message: '당원 인증이 필요합니다.' },
          { status: 403 },
        );
      }

      if (mv.member_type === 'member') {
        const check = await verifyMember(parsed.data.name, parsed.data.birth_date);
        if (!check.verified) {
          return NextResponse.json(
            { success: false, message: '당원 인증에 실패했습니다.' },
            { status: 403 },
          );
        }
      } else if (mv.member_type === 'acquaintance') {
        if (!mv.referrer_name || !mv.referrer_birth_date) {
          return NextResponse.json(
            { success: false, message: '소개 당원 정보가 필요합니다.' },
            { status: 400 },
          );
        }
        const check = await verifyMember(mv.referrer_name, mv.referrer_birth_date);
        if (!check.verified) {
          return NextResponse.json(
            { success: false, message: '소개 당원 인증에 실패했습니다.' },
            { status: 403 },
          );
        }
      }
    }

    const result = await submitApplication(parsed.data);

    if (!result.success) {
      const statusCode = result.message.includes('중복') ? 409 : 410;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('apply API error:', error);
    return NextResponse.json(
      { success: false, message: '신청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
