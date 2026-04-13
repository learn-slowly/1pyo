import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyMember } from '@/lib/sheets';

const verifySchema = z.object({
  name: z.string().min(2, '이름은 2자 이상 입력해주세요'),
  birth_date: z.string().regex(/^\d{8}$/, '생년월일 8자리를 입력해주세요'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { verified: false, message: firstError.message },
        { status: 400 },
      );
    }

    const result = await verifyMember(parsed.data.name, parsed.data.birth_date);
    return NextResponse.json(result);
  } catch (error) {
    console.error('verify-member API error:', error);
    return NextResponse.json(
      { verified: false, message: '인증 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
