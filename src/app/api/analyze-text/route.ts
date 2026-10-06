import { NextRequest, NextResponse } from 'next/server';
import { aiSettingsDB } from '@/lib/db';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/analyze-text — Analyze text using configured Text AI
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const settings = await aiSettingsDB.get(userId);

    if (!settings?.textBaseUrl || !settings?.textApiKey || !settings?.textModelId) {
      return NextResponse.json(
        { success: false, error: 'Text AI analysis is not configured. Go to Settings → AI Analysis to set up your provider.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { foodName, portion } = body;

    if (!foodName) {
      return NextResponse.json(
        { success: false, error: 'No food name provided' },
        { status: 400 }
      );
    }

    // Build the request
    const systemPrompt = `You are a nutrition expert AI. The user has provided a food name and portion/weight. Estimate the nutritional values and provide a short health advice about this food. Return ONLY valid JSON using this exact schema, with no additional text or markdown:
{
  "calories": number,
  "protein": number (grams),
  "fat": number (grams),
  "carbohydrates": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "advice": "string - brief health advice about this food"
}`;

    const url = settings.textBaseUrl.replace(/\/$/, '') + '/chat/completions';

    const payload: Record<string, unknown> = {
      model: settings.textModelId,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Food: ${foodName}\nPortion/Weight: ${portion || '1 standard serving'}`,
        },
      ],
    };

    if (settings.textOutputTokenLimit && settings.textOutputTokenLimit > 0) {
      payload.max_tokens = settings.textOutputTokenLimit;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.textApiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `AI provider returned an error (${response.status}). Please check your settings.` },
        { status: 502 }
      );
    }

    const result = await response.json();

    // Extract the content from the response
    let content = '';
    if (result.choices && result.choices[0]?.message?.content) {
      content = result.choices[0].message.content;
    } else if (result.content) {
      content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    } else {
      return NextResponse.json(
        { success: false, error: 'Unexpected response format from AI provider' },
        { status: 502 }
      );
    }

    // Try to parse JSON from the response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch {
          return NextResponse.json(
            { success: false, error: 'Could not parse the AI response. Valid JSON not found.' },
            { status: 502 }
          );
        }
      } else {
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try {
            parsed = JSON.parse(objMatch[0]);
          } catch {
            return NextResponse.json(
              { success: false, error: 'Could not parse the AI response. Valid JSON not found.' },
              { status: 502 }
            );
          }
        } else {
          return NextResponse.json(
            { success: false, error: 'The AI did not return recognizable JSON.' },
            { status: 502 }
          );
        }
      }
    }

    const analysis = {
      calories: Math.max(0, Number(parsed.calories || parsed.kcal || 0)),
      protein: Math.max(0, Number(parsed.protein || 0)),
      fat: Math.max(0, Number(parsed.fat || parsed.fats || 0)),
      carbohydrates: Math.max(0, Number(parsed.carbohydrates || parsed.carbs || 0)),
      fiber: Math.max(0, Number(parsed.fiber || 0)),
      sugar: Math.max(0, Number(parsed.sugar || 0)),
      advice: String(parsed.advice || parsed.notes || ''),
    };

    return NextResponse.json({ success: true, data: analysis });

  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Analysis timed out.' },
        { status: 408 }
      );
    }
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json(
      { success: false, error: `Text analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
