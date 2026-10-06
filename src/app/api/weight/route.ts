import { NextRequest, NextResponse } from 'next/server';
import { weightDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/weight
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const entries = await weightDB.getAll(userId);
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve weight entries' },
      { status: 500 }
    );
  }
}

// POST /api/weight
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();

    if (body.weight === undefined || body.weight <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid weight is required' },
        { status: 400 }
      );
    }

    const entry = await weightDB.create(userId, {
      weight: Number(body.weight),
      unit: body.unit || 'kg',
      date: body.date || new Date().toISOString().split('T')[0],
      note: body.note || '',
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create weight entry' },
      { status: 500 }
    );
  }
}
