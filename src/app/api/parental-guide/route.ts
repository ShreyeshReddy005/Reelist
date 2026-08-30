import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const year = searchParams.get('year');

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });
    }

    const prompt = `Provide the detailed IMDb Parental Guide for the movie/show "${title}" ${year ? `(${year})` : ''}. 
If it is completely unknown, make a reasonable guess based on its genre and age rating, or state "None" for severity with description "Not enough data".`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          responseSchema: {
            type: "OBJECT",
            properties: {
              sexAndNudity: {
                type: "OBJECT",
                properties: {
                  severity: { type: "STRING", description: "None, Mild, Moderate, or Severe" },
                  description: { type: "STRING" }
                },
                required: ["severity", "description"]
              },
              violenceAndGore: {
                type: "OBJECT",
                properties: {
                  severity: { type: "STRING" },
                  description: { type: "STRING" }
                },
                required: ["severity", "description"]
              },
              profanity: {
                type: "OBJECT",
                properties: {
                  severity: { type: "STRING" },
                  description: { type: "STRING" }
                },
                required: ["severity", "description"]
              },
              alcoholAndDrugs: {
                type: "OBJECT",
                properties: {
                  severity: { type: "STRING" },
                  description: { type: "STRING" }
                },
                required: ["severity", "description"]
              },
              frightening: {
                type: "OBJECT",
                properties: {
                  severity: { type: "STRING" },
                  description: { type: "STRING" }
                },
                required: ["severity", "description"]
              }
            },
            required: ["sexAndNudity", "violenceAndGore", "profanity", "alcoholAndDrugs", "frightening"]
          }
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API Error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No text in Gemini response");
    
    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Parental Guide API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch parental guide' }, { status: 500 });
  }
}
