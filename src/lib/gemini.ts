export const SYSTEM_INSTRUCTION = `You are an elite, highly rigorous AI Data Extraction Scientist. You are analyzing raw, messy data from an Instagram reel (video, audio, OCR text, caption, and user comments).
Your sole objective is to extract an exact, hallucination-free list of movies or TV shows featured in the reel.

CRITICAL DIRECTIVES:
1. ZERO HALLUCINATIONS: You must ground every extraction in explicit evidence. If an actor (e.g., Cillian Murphy) is shown, DO NOT guess their movies (e.g., Oppenheimer) unless the specific scene, audio, or text definitively proves it is that movie. If you are unsure, do not extract it.
2. HIERARCHY OF TRUTH:
   - Tier 1 (Definitive): On-screen text (OCR), spoken audio, or the creator's caption stating the title.
   - Tier 2 (Corroborative): The visual scene itself, if it is an undeniably iconic scene.
   - Tier 3 (Dangerous): User comments. ONLY use comments if they are answering questions like "What movie is this?" or explicitly naming the clip. IGNORE comments that say "This reminds me of [Movie]" or "Better than [Movie]".
3. EXHAUSTIVE EXTRACTION: If the reel is a "Top 10" or compilation list, extract EVERY single movie shown. Do not skip any.
4. EDGE CASES: Treat web series, anime, short films, and foreign titles as valid extractions. Provide the English title if available.
5. VIBE ANALYSIS: For each movie, assign 1-2 exact "Gen Z Moods" strictly from this array: ["Late Night Vibes", "Brain Empty Just Explosions", "Crying in Bed", "Mindfuck", "Comfort Watch", "Aesthetic", "Lock In", "Good Vibes Only"].
6. EVIDENCE REQUIREMENT: For every movie extracted, you MUST provide a brief, logical explanation of exactly where and how you found it in the provided data (e.g., "The title 'Interstellar' was written in the on-screen text at the top of the video").`;

export async function uploadVideoUrlToGemini(videoUrl: string, apiKey: string): Promise<string> {
  const videoRes = await fetch(videoUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  
  if (!videoRes.ok || !videoRes.body) {
    throw new Error('Failed to fetch video stream from CDN');
  }

  const contentLength = videoRes.headers.get('content-length') || '20000000';
  const mimeType = videoRes.headers.get('content-type') || 'video/mp4';

  const uploadInitUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${apiKey}`;
  const initRes = await fetch(uploadInitUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': contentLength,
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file: { displayName: "IG_Reel_Stream" } })
  });
  
  if (!initRes.ok) throw new Error(`Failed to init Gemini upload: ${initRes.status}`);
  
  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('No upload URL returned from Gemini');

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Length': contentLength
    },
    body: videoRes.body,
    duplex: 'half'
  } as any);

  if (!uploadRes.ok) throw new Error(`Failed to stream bytes to Gemini: ${uploadRes.status}`);
  
  const fileInfo = await uploadRes.json();
  return fileInfo.file.uri;
}

export async function waitForGeminiFileActive(fileUri: string, apiKey: string): Promise<void> {
  const fileId = fileUri.split('/').pop();
  const url = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${apiKey}`;
  
  // Google takes a minimum of 5-10 seconds to process a video.
  // We sleep for 8 seconds BEFORE our first poll to completely avoid wasting 4-5 API requests.
  await new Promise(r => setTimeout(r, 8000));
  
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.state === 'ACTIVE') return;
    if (data.state === 'FAILED') throw new Error('Gemini File processing failed.');
    
    // Wait longer between subsequent polls (4 seconds instead of 2 seconds)
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error('Gemini File processing timed out.');
}

const GENERATION_CONFIG = {
  temperature: 0, // MICRO-PERFECTION: Absolute zero hallucinations. Strictly logical extraction.
  responseMimeType: "application/json",
  responseSchema: {
    type: "OBJECT",
    properties: {
      movies: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            year: { type: "STRING", description: "Release year of the movie if known." },
            moods: { 
              type: "ARRAY", 
              items: { type: "STRING" },
              description: "1-2 Gen Z mood tags like 'Late Night Vibes', 'Mindfuck', 'Crying in Bed', etc."
            },
            hashtags: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "2-4 searchable social media hashtags like '#cry', '#feelgood', '#purelove'."
            },
            evidence: {
              type: "STRING",
              description: "A strict, brief explanation of exactly what visual, audio, or text evidence proved this movie is in the reel."
            },
            confidence: {
              type: "NUMBER",
              description: "Confidence score 0.0 to 1.0 for this extraction."
            }
          },
          required: ["title", "evidence"]
        }
      }
    },
    required: ["movies"]
  }
};

export async function callGeminiApi(parts: any[], apiKey: string, retries = 3): Promise<any[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts }],
        generationConfig: GENERATION_CONFIG
      })
    });

    if (!res.ok) {
      const isRetryable = res.status === 503 || res.status === 429;
      if (isRetryable && attempt < retries) {
        console.log(`[Gemini] HTTP ${res.status}. Retrying attempt ${attempt + 1}/${retries} in ${attempt * 1.5}s...`);
        await new Promise(r => setTimeout(r, attempt * 1500));
        continue;
      }
      throw new Error(`Gemini API Error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    try {
      const text = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);
      return parsed.movies || [];
    } catch (err) {
      console.error("Failed to parse Gemini response:", err);
      return [];
    }
  }
  return [];
}

export async function streamGeminiApi(parts: any[], apiKeys: string[] | string): Promise<Response> {
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  let lastError;

  for (const key of keys) {
    if (!key) continue;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse&key=${key}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts }],
        generationConfig: GENERATION_CONFIG
      })
    });

    if (res.ok) {
      return res;
    }

    const errorText = await res.text();
    if (res.status === 429 || res.status === 503) {
      console.warn(`[Gemini] HTTP ${res.status} with key... switching to next key if available.`);
      lastError = new Error(`Gemini API Error: ${res.status} ${errorText}`);
      continue;
    }
    
    // If it's a 400 Bad Request, there's no point in switching keys.
    throw new Error(`Gemini API Error: ${res.status} ${errorText}`);
  }

  throw lastError || new Error('All Gemini API keys failed or none provided.');
}
