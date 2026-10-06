import { NextRequest, NextResponse } from 'next/server';
import { foodDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/food?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      const entries = await foodDB.getByDate(userId, date);
      return NextResponse.json({ success: true, data: entries });
    }

    const entries = await foodDB.getAll(userId);
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve food entries' },
      { status: 500 }
    );
  }
}

// POST /api/food
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();

    if (!body.foodName || body.calories === undefined) {
      return NextResponse.json(
        { success: false, error: 'Food name and calories are required' },
        { status: 400 }
      );
    }

    const entry = await foodDB.create(userId, {
      foodName: body.foodName,
      portion: body.portion || '',
      calories: Number(body.calories) || 0,
      protein: Number(body.protein) || 0,
      fat: Number(body.fat) || 0,
      carbohydrates: Number(body.carbohydrates) || 0,
      fiber: Number(body.fiber) || 0,
      sugar: Number(body.sugar) || 0,
      date: body.date || new Date().toISOString().split('T')[0],
      time: body.time || new Date().toTimeString().slice(0, 5),
      notes: body.notes || '',
      source: body.source || 'manual',
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create food entry' },
      { status: 500 }
    );
  }
}
