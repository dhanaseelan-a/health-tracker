import { NextRequest, NextResponse } from 'next/server';
import { waterDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    const data = date ? await waterDB.getByDate(userId, date) : await waterDB.getAll(userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch water entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const entry = await waterDB.create(userId, body);
    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save water entry' },
      { status: 500 }
    );
  }
}
