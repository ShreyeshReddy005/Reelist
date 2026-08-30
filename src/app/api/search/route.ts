import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: number;
  title: string;
  year: string;
  overview: string;
  posterUrl: string;
  tmdbRating: number;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Missing "query" search parameter. Usage: /api/search?query=Inception' },
        { status: 400 }
      );
    }

    const tmdbKey = process.env.TMDB_API_KEY;

    if (!tmdbKey) {
      return NextResponse.json(
        { error: 'Server configuration error: TMDB_API_KEY is not set.' },
        { status: 500 }
      );
    }

    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(query.trim())}&include_adult=false&language=en-US&page=1`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[search] TMDB search failed (HTTP ${response.status}): ${body.slice(0, 200)}`);
      return NextResponse.json(
        { error: `TMDB search failed (HTTP ${response.status}).` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawResults: unknown[] = data?.results ?? [];

    const results: SearchResult[] = rawResults
      .slice(0, 20) // Cap at 20 results
      .map((item: any) => ({
        id: item.id,
        title: item.title ?? 'Unknown',
        year: item.release_date ? item.release_date.split('-')[0] : 'N/A',
        overview: item.overview ?? '',
        posterUrl: item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : '',
        tmdbRating: item.vote_average ?? 0,
      }));

    return NextResponse.json({ results }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[search] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
