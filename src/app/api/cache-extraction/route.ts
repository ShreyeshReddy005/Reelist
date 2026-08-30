import { NextRequest, NextResponse } from 'next/server';
import { saveCachedExtraction } from '@/lib/firebase/firestore';

function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    const { url, movies } = await request.json();
    if (!url || !movies || !Array.isArray(movies) || movies.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const shortcode = extractShortcode(url);
    if (!shortcode) {
      return NextResponse.json({ error: 'Not an Instagram URL' }, { status: 400 });
    }

    await saveCachedExtraction(shortcode, movies);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[cache-extraction] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
