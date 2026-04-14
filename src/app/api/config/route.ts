import { NextResponse } from 'next/server';
import { getConfig, getCandidateInfo } from '@/lib/sheets';

export async function GET() {
  try {
    const [config, candidates] = await Promise.all([
      getConfig(),
      getCandidateInfo(),
    ]);

    return NextResponse.json({ config, candidates });
  } catch (err) {
    console.error('Config fetch error:', err);
    return NextResponse.json(
      { error: '설정을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
