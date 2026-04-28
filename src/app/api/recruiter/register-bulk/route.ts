import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitApplication } from '@/lib/sheets';
import { verifyRecruiterToken } from '@/lib/auth';

const slotSchema = z.object({
  type: z.enum(['early', 'polling', 'counting']),
  station_id: z.string().min(1),
  station_name: z.string().min(1),
  sigungu: z.string().min(1),
  time_slot: z.string().min(1),
});

const bulkSchema = z.object({
  name: z.string().min(2).max(20),
  phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/),
  birth_date: z.string().regex(/^\d{8}$/),
  gender: z.enum(['1', '2']),
  zip_code: z.string().max(5).optional().default(''),
  address: z.string().min(2),
  address_detail: z.string().optional().default(''),
  occupation: z.string().min(1).max(20),
  account: z.string().min(2).max(40),
  memo: z.string().max(200).optional().default(''),
  slots: z.array(slotSchema).min(1).max(4),
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
    const parsed = bulkSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ success: false, message: firstError.message }, { status: 400 });
    }

    const { slots, memo, ...applicantInfo } = parsed.data;
    const results: { type: string; time_slot: string; station_name: string; success: boolean; message: string }[] = [];

    for (const slot of slots) {
      const result = await submitApplication(
        { ...applicantInfo, ...slot },
        {
          skipBlacklist: true,
          skipDuplicateCheck: true,
          notes: `모집:${recruiterName}`,
          recruiter: recruiterName,
          memo,
        },
      );
      results.push({
        type: slot.type,
        time_slot: slot.time_slot,
        station_name: slot.station_name,
        success: result.success,
        message: result.message,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const allSuccess = successCount === results.length;

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? `${successCount}건 모두 등록 완료`
        : `${successCount}/${results.length}건 등록 (일부 실패)`,
      results,
    });
  } catch (error) {
    console.error('recruiter bulk register error:', error);
    return NextResponse.json({ success: false, message: '등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
