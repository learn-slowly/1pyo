import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStations, getSigunguList, getConfig } from '@/lib/sheets';

const querySchema = z.object({
  type: z.enum(['early', 'polling', 'counting']),
  sigungu: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      type: searchParams.get('type'),
      sigungu: searchParams.get('sigungu') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'type 파라미터가 필요합니다 (early, polling, counting)' },
        { status: 400 }
      );
    }

    const { type, sigungu } = parsed.data;

    const [stations, sigunguList, config] = await Promise.all([
      getStations(type, sigungu),
      getSigunguList(type),
      getConfig(),
    ]);

    return NextResponse.json({ stations, sigunguList, config });
  } catch (error) {
    console.error('stations API error:', error);
    return NextResponse.json(
      { error: '투표소 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
