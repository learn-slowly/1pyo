import { NextRequest, NextResponse } from 'next/server';
import { getRecruiters } from '@/lib/sheets';
import { createRecruiterToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, code } = await request.json();
    const recruiters = await getRecruiters();

    const found = recruiters.find(r => r.name === name && r.code === code);
    if (!found) {
      return NextResponse.json({ success: false, message: '이름 또는 코드가 올바르지 않습니다.' }, { status: 401 });
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
  } catch {
    return NextResponse.json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
