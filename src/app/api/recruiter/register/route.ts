import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitApplication } from '@/lib/sheets';
import { verifyRecruiterToken } from '@/lib/auth';

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
    const token = request.cookies.get('recruiter_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const { valid, recruiterName } = verifyRecruiterToken(token);
    if (!valid) {
      return NextResponse.json({ success: false, message: '인증이 만료되었습니다.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ success: false, message: firstError.message }, { status: 400 });
    }

    const result = await submitApplication(parsed.data, {
      skipBlacklist: true,
      notes: `모집:${recruiterName}`,
      recruiter: recruiterName,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('recruiter register error:', error);
    return NextResponse.json({ success: false, message: '등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
