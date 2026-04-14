import { NextRequest, NextResponse } from 'next/server';

function verifyJwtPayload(token: string, expectedRole: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp || payload.exp < Date.now() / 1000) return false;
    if (payload.role !== expectedRole) return false;
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin 경로
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (pathname === '/admin' || pathname === '/api/admin/login') {
      return NextResponse.next();
    }
    const token = request.cookies.get('admin_token')?.value;
    if (!token || !verifyJwtPayload(token, 'admin')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/admin', request.url));
      response.cookies.delete('admin_token');
      return response;
    }
    return NextResponse.next();
  }

  // Recruiter 경로
  if (pathname.startsWith('/recruiter') || pathname.startsWith('/api/recruiter')) {
    if (pathname === '/recruiter' || pathname === '/api/recruiter/login') {
      return NextResponse.next();
    }
    const token = request.cookies.get('recruiter_token')?.value;
    if (!token || !verifyJwtPayload(token, 'recruiter')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/recruiter', request.url));
      response.cookies.delete('recruiter_token');
      return response;
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path+', '/api/admin/:path+', '/recruiter/:path+', '/api/recruiter/:path+'],
};
