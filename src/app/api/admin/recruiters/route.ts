import { NextRequest, NextResponse } from 'next/server';
import { getRecruiters, addRecruiter, toggleRecruiter, deleteRecruiter } from '@/lib/sheets';

export async function GET() {
  try {
    const recruiters = await getRecruiters();
    return NextResponse.json({ success: true, recruiters });
  } catch (error) {
    console.error('get recruiters error:', error);
    return NextResponse.json({ success: false, message: '조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, message: '이름을 2자 이상 입력해주세요.' }, { status: 400 });
    }
    const result = await addRecruiter(name.trim());
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('add recruiter error:', error);
    return NextResponse.json({ success: false, message: '추가 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { rowIndex, status } = await request.json();
    if (!rowIndex || !['active', 'inactive'].includes(status)) {
      return NextResponse.json({ success: false, message: '잘못된 요청입니다.' }, { status: 400 });
    }
    const result = await toggleRecruiter(rowIndex, status);
    return NextResponse.json(result);
  } catch (error) {
    console.error('toggle recruiter error:', error);
    return NextResponse.json({ success: false, message: '변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { rowIndex } = await request.json();
    if (!rowIndex) {
      return NextResponse.json({ success: false, message: '잘못된 요청입니다.' }, { status: 400 });
    }
    const result = await deleteRecruiter(rowIndex);
    return NextResponse.json(result);
  } catch (error) {
    console.error('delete recruiter error:', error);
    return NextResponse.json({ success: false, message: '삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
