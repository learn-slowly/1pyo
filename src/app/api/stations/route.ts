import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStations, getSigunguList, getConfig } from '@/lib/sheets';
import { verifyAdminToken, verifyRecruiterToken } from '@/lib/auth';
import type { Station } from '@/lib/types';

function markStationAsFull(station: Station): Station {
  switch (station.type) {
    case 'polling':
      return { ...station, am_count: station.am_max, pm_count: station.pm_max };
    case 'early':
      return {
        ...station,
        d1_am_count: station.slot_max,
        d1_pm_count: station.slot_max,
        d2_am_count: station.slot_max,
        d2_pm_count: station.slot_max,
      };
    case 'counting':
      return { ...station, current_count: station.max_count };
  }
}

function isPrivilegedRequest(request: NextRequest): boolean {
  const adminToken = request.cookies.get('admin_token')?.value;
  if (adminToken && verifyAdminToken(adminToken)) return true;
  const recruiterToken = request.cookies.get('recruiter_token')?.value;
  if (recruiterToken && verifyRecruiterToken(recruiterToken).valid) return true;
  return false;
}

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

    const [rawStations, sigunguList, config] = await Promise.all([
      getStations(type, sigungu),
      getSigunguList(type),
      getConfig(),
    ]);

    // 비로그인(일반 이용자)이면 차단 시군구의 투표소를 마감 상태로 변환
    const stations = isPrivilegedRequest(request)
      ? rawStations
      : rawStations.map(s =>
          config.blocked_sigungu_public.includes(s.sigungu) ? markStationAsFull(s) : s
        );

    const { password, ...safeConfig } = config;
    return NextResponse.json(
      { stations, sigunguList, config: safeConfig },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } },
    );
  } catch (error) {
    console.error('stations API error:', error);
    return NextResponse.json(
      { error: '투표소 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
