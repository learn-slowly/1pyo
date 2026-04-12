import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitVoterCountReport, submitIncidentReport } from '@/lib/sheets';
import { sendTelegramAlert } from '@/lib/telegram';

const voterCountSchema = z.object({
  report_type: z.literal('voter_count'),
  reporter_name: z.string().min(2, '이름은 2자 이상 입력해주세요'),
  reporter_phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '올바른 연락처를 입력해주세요'),
  observation_type: z.enum(['early', 'polling']),
  station_name: z.string().min(1, '투표소를 입력해주세요'),
  sigungu: z.string().min(1, '시군구를 입력해주세요'),
  report_hour: z.string().min(1, '시간대를 선택해주세요'),
  cumulative_voters: z.number().min(0, '투표인수를 입력해주세요'),
});

const incidentSchema = z.object({
  report_type: z.literal('incident'),
  reporter_name: z.string().min(2, '이름은 2자 이상 입력해주세요'),
  reporter_phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '올바른 연락처를 입력해주세요'),
  observation_type: z.enum(['early', 'polling', 'counting']),
  station_name: z.string().min(1, '참관 장소를 입력해주세요'),
  sigungu: z.string().min(1, '시군구를 입력해주세요'),
  incident_type: z.string().min(1, '상황 유형을 선택해주세요'),
  description: z.string().min(5, '상세 내용을 5자 이상 입력해주세요'),
  objection_filed: z.boolean(),
  objection_result: z.string().optional().default(''),
});

const reportSchema = z.discriminatedUnion('report_type', [
  voterCountSchema,
  incidentSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reportSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, message: firstError.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.report_type === 'voter_count') {
      const { report_type, ...reportData } = data;
      const result = await submitVoterCountReport(reportData);
      return NextResponse.json(result);
    } else {
      const { report_type, ...reportData } = data;
      const result = await submitIncidentReport(reportData);

      if (result.success) {
        const typeLabel = data.observation_type === 'polling' ? '본투표'
          : data.observation_type === 'early' ? '사전투표' : '개표';
        await sendTelegramAlert(
          `🚨 <b>특이사항 보고</b>\n\n` +
          `📍 ${data.sigungu} ${data.station_name} (${typeLabel})\n` +
          `🏷 ${data.incident_type}\n` +
          `📝 ${data.description}\n` +
          `${data.objection_filed ? '✅ 이의 제기함' : ''}` +
          `${data.objection_result ? ` → ${data.objection_result}` : ''}\n\n` +
          `👤 ${data.reporter_name} (${data.reporter_phone})`
        );
      }

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('report API error:', error);
    return NextResponse.json(
      { success: false, message: '보고 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
