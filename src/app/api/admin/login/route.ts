import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/sheets';
import { createAdminToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const config = await getConfig();

    if (!config.password || password !== config.password) {
      return NextResponse.json({ success: false, message: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const token = createAdminToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_token', token, {
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
