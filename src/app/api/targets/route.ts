import { NextRequest, NextResponse } from 'next/server';
import { targetsDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const targets = await targetsDB.get(userId);
    return NextResponse.json({ success: true, data: targets });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve targets' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const targets = await targetsDB.save(userId, body);
    return NextResponse.json({ success: true, data: targets });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save targets' },
      { status: 500 }
    );
  }
}
