import { NextRequest, NextResponse } from 'next/server';
import { getRecruiters } from '@/lib/sheets';
import { createRecruiterToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, message: '모집책 이름이 필요합니다.' }, { status: 400 });
    }

    const recruiters = await getRecruiters();
    const found = recruiters.find(r => r.name === name);
    if (!found) {
      return NextResponse.json({ success: false, message: '존재하지 않는 모집책입니다.' }, { status: 404 });
    }

    const token = createRecruiterToken(found.name);
    const response = NextResponse.json({ success: true, recruiterName: found.name });
    response.cookies.set('recruiter_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 3600,
    });
    return response;
  } catch (error) {
    console.error('impersonate recruiter error:', error);
    return NextResponse.json({ success: false, message: '전환 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
