import { NextRequest, NextResponse } from 'next/server';
import { weightDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const entry = await weightDB.update(userId, params.id, body);

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Weight entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update weight entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const deleted = await weightDB.delete(userId, params.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Weight entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete weight entry' },
      { status: 500 }
    );
  }
}
