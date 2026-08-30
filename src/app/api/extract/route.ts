import { NextRequest, NextResponse } from 'next/server';
import { scrapeInstagramEmbed, EmbedResult, checkApifyRun } from '@/lib/instagram';
import { getCachedExtraction } from '@/lib/firebase/firestore';
import { uploadVideoUrlToGemini, waitForGeminiFileActive, SYSTEM_INSTRUCTION, callGeminiApi } from '@/lib/gemini';

export const maxDuration = 60; // Allow function to run up to 60s on Vercel

async function getGeminiResult(
  caption: string,
  comments: string[],
  videoUrl: string | null,
  imageUrls: string[],
  apiKeys: string[],
  forceDeepExtract: boolean
): Promise<any[]> {
  let combinedText = caption || 'No caption provided.';
  if (comments && comments.length > 0) {
    combinedText += '\n\nTop Comments:\n' + comments.slice(0, 20).map(c => '- ' + c).join('\n');
  }

  let lastError;
  for (const apiKey of apiKeys) {
    if (!apiKey) continue;
    const parts: any[] = [
      { text: SYSTEM_INSTRUCTION + '\n\nText/Caption/Comments:\n' + combinedText }
    ];

    try {
      if (forceDeepExtract && videoUrl) {
        console.log(`[extract] Streaming video for deep extract using key ...${apiKey.slice(-4)}`);
        const fileUri = await uploadVideoUrlToGemini(videoUrl, apiKey);
        console.log(`[extract] Waiting for Gemini file to become active...`);
        await waitForGeminiFileActive(fileUri, apiKey);
        parts.push({ fileData: { mimeType: 'video/mp4', fileUri } });
      }

      console.log(`[extract] Starting Gemini call using key ...${apiKey.slice(-4)}`);
      return await callGeminiApi(parts, apiKey);
    } catch (e: any) {
      if (e.message.includes('429') || e.message.includes('503')) {
        console.warn(`[Gemini] HTTP 429/503 caught. Switching to next API key if available...`);
        lastError = e;
        continue;
      }
      throw e;
    }
  }
  
  throw lastError || new Error('All Gemini API keys failed or none provided.');
}

export async function POST(request: NextRequest) {
  try {
    let body: { url?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    let { url, runId, forceDeepExtract } = body as { url?: string, runId?: string, forceDeepExtract?: boolean };
    
    const apiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2
    ].filter(Boolean) as string[];
    
    if (apiKeys.length === 0) {
      // No fallback keys allowed in production source code. Use environment variables.
    }

    let geminiMovies: any[] | null = null;
    let deepExtractAvailable = !runId && !forceDeepExtract;
    
    if (runId) {
      console.log(`[extract] Polling Apify run: ${runId}`);
      const statusData = await checkApifyRun(runId);
      
      if (statusData.status === 'RUNNING') {
        return NextResponse.json({ status: 'polling', runId }, { status: 202 });
      } else if (statusData.status === 'FAILED') {
        return NextResponse.json({ error: 'Apify background extraction failed.' }, { status: 500 });
      } else if (statusData.status === 'SUCCEEDED' && statusData.result) {
        geminiMovies = await getGeminiResult(
          statusData.result.caption || '',
          statusData.result.comments || [],
          statusData.result.videoUrl || null,
          statusData.result.imageUrls || [],
          apiKeys,
          true 
        );
      }
    } else {
      if (!url || typeof url !== 'string' || !url.trim()) {
        return NextResponse.json({ error: 'Missing or empty "url" field.' }, { status: 400 });
      }

      url = url.trim().replace(/[.,)"'\]]+$/, '');
      const isInstagramUrl = /^https?:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[A-Za-z0-9_-]+/i.test(url);
      
      if (isInstagramUrl || url.includes('instagram.com')) {
        // --- 1. Global Cache Check (Optimization #1) ---
        const shortcodeMatch = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
        const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;
        
        if (shortcode && !forceDeepExtract) {
          const cachedMovies = await getCachedExtraction(shortcode);
          if (cachedMovies && cachedMovies.length > 0) {
            console.log(`[extract] Cache hit for ${shortcode}!`);
            
            return NextResponse.json({ movies: cachedMovies }, {
              status: 200,
              headers: {
                'Deep-Extract-Available': 'true',
                'X-Cache': 'HIT'
              }
            });
          }
        }

        // --- 2. Scraping ---
        let embedData: EmbedResult = { caption: '', videoUrl: null, imageUrls: [], comments: [], extractionMeta: { layers: [], totalTimeMs: 0 } };
        try {
          embedData = await scrapeInstagramEmbed(url, forceDeepExtract);
        } catch (e: any) {
          console.warn(`[extract] Instagram scraping failed: ${e.message}`);
        }
        
        if (embedData.apifyRunId) {
          return NextResponse.json({ status: 'polling', runId: embedData.apifyRunId }, { status: 202 });
        }

        geminiMovies = await getGeminiResult(
          embedData.caption,
          embedData.comments,
          embedData.videoUrl,
          embedData.imageUrls,
          apiKeys,
          !!forceDeepExtract
        );
      } else {
        return NextResponse.json({ error: 'Direct title search not supported in stream mode.' }, { status: 400 });
      }
    }

    if (!geminiMovies) {
      return NextResponse.json({ error: 'Failed to extract movies.' }, { status: 500 });
    }

    return NextResponse.json({ movies: geminiMovies }, {
      status: 200,
      headers: {
        'Deep-Extract-Available': deepExtractAvailable ? 'true' : 'false'
      }
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[extract] Pipeline error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
