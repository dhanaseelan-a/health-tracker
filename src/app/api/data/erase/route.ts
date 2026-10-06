import { NextResponse } from 'next/server';
import { backupDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    await backupDB.eraseAll(userId);

    return NextResponse.json({ success: true, message: 'All data erased successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to erase data' },
      { status: 500 }
    );
  }
}
