import { NextRequest, NextResponse } from 'next/server';
import { aiSettingsDB } from '@/lib/db';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/ai/test — Test connection to AI endpoint
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();

    // Use provided settings or fall back to stored settings
    const stored = await aiSettingsDB.get(userId);
    const baseUrl = body.baseUrl || stored?.baseUrl;
    const apiKey = (body.apiKey && body.apiKey !== '••••••••') ? body.apiKey : stored?.apiKey;
    const modelId = body.modelId || stored?.modelId;

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'Base URL is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Construct a simple test request
    const url = baseUrl.replace(/\/$/, '') + '/chat/completions';

    const testPayload: Record<string, unknown> = {
      model: modelId || 'test',
      messages: [
        { role: 'user', content: 'Say "ok" in one word.' }
      ],
      max_tokens: 10,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        status: response.status,
      });
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json({
        success: false,
        error: `API returned ${response.status}: ${errorText.substring(0, 200)}`,
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Connection timed out after 15 seconds' },
        { status: 408 }
      );
    }

    const message = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.json(
      { success: false, error: `Connection failed: ${message}` },
      { status: 500 }
    );
  }
}
