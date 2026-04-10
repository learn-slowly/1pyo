import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin 로그인 페이지와 로그인 API는 보호하지 않음
  if (pathname === '/admin' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // JWT 검증 (middleware는 edge runtime이라 crypto 대신 간단 검증)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error();
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp || payload.exp < Date.now() / 1000) throw new Error();
    if (payload.role !== 'admin') throw new Error();
  } catch {
    const response = NextResponse.redirect(new URL('/admin', request.url));
    response.cookies.delete('admin_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path+', '/api/admin/:path+'],
};
