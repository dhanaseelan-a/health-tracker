import { NextRequest, NextResponse } from 'next/server';
import { aiSettingsDB } from '@/lib/db';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/analyze-food — Analyze food image using configured AI
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const settings = await aiSettingsDB.get(userId);

    if (!settings?.baseUrl || !settings?.apiKey || !settings?.modelId) {
      return NextResponse.json(
        { success: false, error: 'AI analysis is not configured. Go to Settings → AI Analysis to set up your provider.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Build the multimodal request
    const systemPrompt = `You are analyzing a food photograph for personal nutrition tracking. Identify the visible food as accurately as possible. Estimate the portion size and nutritional values per serving shown in the image. Return ONLY valid JSON using this exact schema, with no additional text or markdown:
{
  "foodName": "string - name of the food",
  "portion": "string - estimated serving size (e.g., '1 cup', '200g', '1 medium bowl')",
  "calories": number,
  "protein": number (grams),
  "fat": number (grams),
  "carbohydrates": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "confidence": number (0.0 to 1.0 - how confident you are in this estimate),
  "notes": "string - brief notes about the estimate"
}
Nutrition values are estimates and should not be presented as medically precise.`;

    const url = settings.baseUrl.replace(/\/$/, '') + '/chat/completions';

    const payload: Record<string, unknown> = {
      model: settings.modelId,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this food image and estimate its nutritional content. Return only JSON.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
    };

    // Add token limits if configured
    if (settings.outputTokenLimit && settings.outputTokenLimit > 0) {
      payload.max_tokens = settings.outputTokenLimit;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
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
      // Try direct parse first
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch {
          return NextResponse.json(
            { success: false, error: 'Could not parse the AI response. The model did not return valid JSON.' },
            { status: 502 }
          );
        }
      } else {
        // Try to find JSON object in the text
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try {
            parsed = JSON.parse(objMatch[0]);
          } catch {
            return NextResponse.json(
              { success: false, error: 'Could not parse the AI response. The model did not return valid JSON.' },
              { status: 502 }
            );
          }
        } else {
          return NextResponse.json(
            { success: false, error: 'The AI did not return a recognizable food analysis.' },
            { status: 502 }
          );
        }
      }
    }

    // Validate and normalize the response
    const analysis = {
      foodName: String(parsed.foodName || parsed.food_name || parsed.name || 'Unknown food'),
      portion: String(parsed.portion || parsed.serving || parsed.servingSize || '1 serving'),
      calories: Math.max(0, Number(parsed.calories || parsed.kcal || 0)),
      protein: Math.max(0, Number(parsed.protein || 0)),
      fat: Math.max(0, Number(parsed.fat || parsed.fats || 0)),
      carbohydrates: Math.max(0, Number(parsed.carbohydrates || parsed.carbs || 0)),
      fiber: Math.max(0, Number(parsed.fiber || 0)),
      sugar: Math.max(0, Number(parsed.sugar || 0)),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence || 0.5))),
      notes: String(parsed.notes || parsed.note || ''),
    };

    return NextResponse.json({ success: true, data: analysis });

  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Analysis timed out. The request took longer than 60 seconds.' },
        { status: 408 }
      );
    }

    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json(
      { success: false, error: `Food analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
