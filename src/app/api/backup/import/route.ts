import { NextRequest, NextResponse } from 'next/server';
import { backupDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid backup data format' },
        { status: 400 }
      );
    }

    await backupDB.importAll(userId, body);

    return NextResponse.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to import backup data' },
      { status: 500 }
    );
  }
}
