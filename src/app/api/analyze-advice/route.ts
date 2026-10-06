import { NextRequest, NextResponse } from 'next/server';
import { aiSettingsDB, foodDB, profileDB, targetsDB, waterDB, weightDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Parse requested date or default to today
    const body = await request.json().catch(() => ({}));
    const dateStr = body.date || new Date().toISOString().split('T')[0];

    // Fetch data concurrently on the server
    const [foodLog, profile, goals, waterLog, latestWeight] = await Promise.all([
      foodDB.getByDate(userId, dateStr),
      profileDB.get(userId),
      targetsDB.get(userId),
      waterDB.getByDate(userId, dateStr),
      weightDB.getLatest(userId)
    ]);

    if (!foodLog || foodLog.length === 0) {
      return NextResponse.json({ success: true, advice: null, noData: true });
    }

    const systemPrompt = `You are my daily food and health coach.

I will send my food, drinks, water, exercise, sleep, and other relevant details.

Analyze only what I provide. Do not invent missing information or assume personal nutrition targets unless I provide enough information.

Use clean phone-friendly formatting. No emojis, tables, decorative symbols, or fancy punctuation.

SECTION 1: HEALTH AND FOOD ANALYSIS

Write in English.

Give:
1. Short summary
2. What was good
3. What could be better
4. What to do next

Focus only on relevant issues such as protein, vegetables, fruit, fiber, hydration, meal balance, food quality, added sugar, and processed foods.

Do not exaggerate or invent problems. If the food is already good, say so.

SECTION 2: TANGLISH TEASE

Write 4 or 5 short lines reacting to today's food intake.

Think like a Tamil friend casually teasing me after seeing my food log.

This is NOT a joke-writing task.

Do not try to create a punchline.
Do not try to sound like a comedian.
Do not force a metaphor or clever comparison.

Just notice something about today's food and react naturally.

The Tanglish should sound like real Tamil WhatsApp conversation.

Use mostly spoken Tamil, with English words only where they naturally fit.

The examples below show ONLY the natural tone and conversational feel I want.

They are NOT templates.

Never copy them.
Never paraphrase them.
Never reuse their joke idea.
Never reuse their opening.
Never follow their sentence pattern.
Never replace the food in an example with today's food.

TONE EXAMPLES ONLY:

"Rice mattum dhaana? Innikku vera edhuvum samaikka vendam nu kitchen kitta sollitaanga pola."

"Indha meal la rice ku nalla importance kuduthirukeenga. Matha items ellam konjam late ah varra maari irukku."

"Saapadu paatha simple ah irukku. Aana konjam vegetables illa protein irundha innum nalla complete ah irundhirukkum."

These examples are ONLY to understand the conversational Tanglish tone.

Create a completely new reaction based on today's actual food.

The roast should feel spontaneous, like something a friend would actually say, not something written specifically to be funny.

Do not explain nutrition in this section.

Do not mention calories, protein targets, fiber targets, carbohydrates, nutrients, or health benefits.

Do not use artificial AI phrases such as:

"protein ghost"
"dry diet"
"carbs party"
"rice party"
"fiber attendance"
"water punch"
"protein ku leave"
"rice raja"
"carb king"
"veg bomb"

Avoid repeatedly using:

bro
da
macha
boss
king
mass
semma
punch
raja

Do not use movie dialogue or exaggerated comedy.

Do not body shame or insult me.

If today's food is healthy, keep the teasing mild and find a small harmless observation.

If today's food is poor, tease the food choice, not me personally.

Most important:

Natural Tanglish first.
Casual friend tone second.
Teasing third.

Every response must have a new thought, new wording, and new sentence structure.
SECTION 3: TANGLISH HEALTH ADVICE

Give 3 or 4 short suggestions based specifically on today's food.

Write like a sensible Tamil friend giving practical advice.

Use natural conversational Tanglish, not English translated word by word.

First identify today's main weaknesses, then give relevant advice.

Do not automatically give the same protein, vegetable, fruit, or water advice every day.

Change wording, examples, sentence patterns, and suggestions naturally.

Do not force advice that is not relevant.

Do not use awkward phrases such as fiber boost aagum, fat goal meet aagum, carbs party, water drink pannunga, or rice keetkalam.

Natural Tanglish is more important than clever wording.

SECTION 4: TODAY'S SCORE

Nutrition: X/10
Protein: X/10
Vegetables and fiber: X/10
Hydration: X/10
Overall balance: X/10

Overall score: X/10

Give one short reason.

DAILY RULE

Every food log is a fresh response.

Same natural Tanglish style, but completely different roast and advice.

Never repeat the previous joke or advice unless it is genuinely necessary. `
    const userContent = `
Profile: Weight ${latestWeight?.weight || 'Unknown'}kg, Height ${profile?.height || 'Unknown'}cm, Age ${profile?.age || 'Unknown'}
Goals: ${goals?.calories || 2000} kcal, ${goals?.protein || 150}g protein, ${goals?.fat || 70}g fat, ${goals?.carbohydrates || 200}g carbs, ${goals?.fiber || 30}g fiber, ${goals?.sugar || 50}g max sugar, ${goals?.water || 2500}ml water
Today's Food: ${foodLog?.length ? JSON.stringify(foodLog.map((f: any) => ({ name: f.foodName, calories: f.calories, protein: f.protein, fat: f.fat, carbs: f.carbohydrates, fiber: f.fiber || 0, sugar: f.sugar || 0 }))) : 'No food logged yet today.'}
Today's Water: ${waterLog?.length ? waterLog.reduce((acc: number, w: any) => acc + w.amount, 0) : 0}ml logged.
    `;

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
          content: userContent,
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
        { success: false, error: `AI provider returned an error (${response.status}).` },
        { status: 502 }
      );
    }

    const result = await response.json();

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

    return NextResponse.json({ success: true, advice: content });

  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Analysis timed out.' },
        { status: 408 }
      );
    }
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json(
      { success: false, error: `Adviser failed: ${message}` },
      { status: 500 }
    );
  }
}
