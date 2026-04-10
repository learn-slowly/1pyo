import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitApplication } from '@/lib/sheets';

const registerSchema = z.object({
  name: z.string().min(2).max(20),
  phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/),
  birth_date: z.string().regex(/^\d{8}$/),
  gender: z.enum(['1', '2']),
  zip_code: z.string().max(5).optional().default(''),
  address: z.string().min(2),
  address_detail: z.string().optional().default(''),
  occupation: z.string().min(1).max(20),
  account: z.string().min(2).max(40),
  type: z.enum(['early', 'polling', 'counting']),
  station_id: z.string().min(1),
  station_name: z.string().min(1),
  sigungu: z.string().min(1),
  time_slot: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ success: false, message: firstError.message }, { status: 400 });
    }

    // 관리자 등록: 블랙리스트 체크 건너뜀, 비고에 표시
    const result = await submitApplication(parsed.data, { skipBlacklist: true, notes: '관리자등록' });
    return NextResponse.json(result);
  } catch (error) {
    console.error('admin register error:', error);
    return NextResponse.json({ success: false, message: '등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
