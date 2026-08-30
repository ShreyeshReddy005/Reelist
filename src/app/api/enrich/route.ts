import { NextRequest, NextResponse } from 'next/server';
import { buildMovieResult } from '@/lib/tmdb';

export async function POST(request: NextRequest) {
  try {
    const { movie, url } = await request.json();
    if (!movie || !movie.title) {
      return NextResponse.json({ error: 'Missing movie title in request body' }, { status: 400 });
    }

    const tmdbKey = process.env.TMDB_API_KEY;
    const omdbKey = process.env.OMDB_API_KEY;

    const enrichedMovie = await buildMovieResult(movie, url || '', tmdbKey, omdbKey);
    
    return NextResponse.json(enrichedMovie, { status: 200 });
  } catch (error: any) {
    console.error('[enrich] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
