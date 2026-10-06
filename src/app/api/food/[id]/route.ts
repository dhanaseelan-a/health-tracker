import { NextRequest, NextResponse } from 'next/server';
import { foodDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PUT /api/food/[id]
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
    const entry = await foodDB.update(userId, params.id, body);

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Food entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update food entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/food/[id]
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

    const deleted = await foodDB.delete(userId, params.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Food entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete food entry' },
      { status: 500 }
    );
  }
}
