import { unstable_cache } from 'next/cache';

export interface TmdbDetails {
  id: number;
  imdb_id: string;
  title: string;
  year: string;
  runtime: string;
  genre: string[];
  director: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  tmdbRating: number;
  trailerKey: string;
  watchProviders: Array<{ name: string; logoUrl: string; link?: string }>;
  watchmodeUrl?: string;
  type?: 'movie' | 'tv';
  reviews?: Array<{ author: string; content: string; rating?: number; url?: string }>;
  seasons?: Array<{ id: number; name: string; seasonNumber: number; episodeCount: number; airDate?: string; overview?: string; posterUrl?: string }>;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
}

async function fetchWithRetry(url: string, options: RequestInit, retries: number = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      // Remove Next.js custom cache to prevent ECONNRESET issues with undici
      const cleanOptions = { ...options };
      delete (cleanOptions as any).next;
      
      const res = await fetch(url, cleanOptions);
      if (!res.ok && res.status >= 500) {
        throw new Error(`Server Error: ${res.status}`);
      }
      return res;
    } catch (err: any) {
      if (i === retries - 1) throw err;
      console.warn(`[TMDB] Fetch failed, retrying (${i + 1}/${retries})... ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1))); 
    }
  }
  throw new Error("Unreachable");
}

export async function fetchTmdbDetails(title: string, year: string | undefined, apiKey: string): Promise<TmdbDetails | null> {
  try {
    let searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(title)}`;
    if (year) {
      searchUrl += `&primary_release_year=${encodeURIComponent(year)}`;
    }
    
    const tmdbHeaders = { 
      'Accept': 'application/json',
      'Connection': 'close' // Fixes Next.js undici ECONNRESET bugs
    };
    const nextConfig = { revalidate: 604800 }; 
    const searchRes = await fetchWithRetry(searchUrl, { headers: tmdbHeaders, next: nextConfig });

    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    let firstResult = null;
    
    if (searchData?.results?.length > 0) {
      const results = searchData.results;
      
      // 1. Try to find a match by exact title AND year
      if (year) {
        firstResult = results.find((r: any) => 
          ((r.title && r.title.toLowerCase() === title.toLowerCase()) || 
           (r.name && r.name.toLowerCase() === title.toLowerCase())) &&
          ((r.release_date && r.release_date.startsWith(year)) ||
           (r.first_air_date && r.first_air_date.startsWith(year)))
        );
      }
      
      // 2. Fallback to just exact title
      if (!firstResult) {
        firstResult = results.find((r: any) => 
          (r.title && r.title.toLowerCase() === title.toLowerCase()) || 
          (r.name && r.name.toLowerCase() === title.toLowerCase())
        );
      }
      
      // 3. Fallback to first movie/tv result
      if (!firstResult) {
        firstResult = results.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
      }
    }

    if (!firstResult && year) {
      const fallbackUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(title)}`;
      const fallbackRes = await fetchWithRetry(fallbackUrl, { headers: tmdbHeaders, next: nextConfig });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        
        if (fallbackData?.results?.length > 0) {
          const results = fallbackData.results;
          
          // Try exact title first
          firstResult = results.find((r: any) => 
            (r.title && r.title.toLowerCase() === title.toLowerCase()) || 
            (r.name && r.name.toLowerCase() === title.toLowerCase())
          );
          
          // Fallback to first movie/tv
          if (!firstResult) {
            firstResult = results.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
          }
        }
      }
    }

    if (!firstResult) return null;
    const mediaId: number = firstResult.id;
    const mediaType: 'movie' | 'tv' = firstResult.media_type || 'movie';

    const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${mediaId}?api_key=${apiKey}&append_to_response=credits,videos,watch/providers,reviews`;
    const detailsRes = await fetchWithRetry(detailsUrl, { headers: tmdbHeaders, next: nextConfig });
    if (!detailsRes.ok) return null;

    const movie = await detailsRes.json();

    const director = movie.credits?.crew?.find((c: { job: string; name: string }) => c.job === 'Director')?.name ?? 'Unknown';

    const videos: Array<{ type: string; site: string; key: string; official?: boolean }> = movie.videos?.results ?? [];
    const trailer =
      videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ??
      videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ??
      videos.find((v) => v.site === 'YouTube') ?? null;

    const usProviders = movie['watch/providers']?.results?.IN || movie['watch/providers']?.results?.US;
    const providerList: Array<{ name: string; logoUrl: string; link?: string }> = [];
    const flatrate = usProviders?.flatrate ?? usProviders?.buy ?? usProviders?.rent ?? [];
    for (const p of flatrate.slice(0, 5)) {
      providerList.push({
        name: p.provider_name,
        logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : '',
        link: usProviders?.link,
      });
    }

    const genres = (movie.genres ?? []).map((g: { name: string }) => g.name);
    const runtimeMin: number | null = movie.runtime ?? null;
    const imdbId = movie.imdb_id ?? '';

    // Fetch Watchmode URL if IMDb ID is available
    let watchmodeUrl = '';
    const watchmodeKey = process.env.WATCHMODE_API_KEY;
    if (imdbId && watchmodeKey) {
      try {
        const wmRes = await fetchWithRetry(`https://api.watchmode.com/v1/title/${imdbId}/sources/?apiKey=${watchmodeKey}&regions=IN,US`, { next: { revalidate: 604800 } });
        if (wmRes.ok) {
          const wmSources: Array<{ type: string; web_url: string; region: string; name?: string; source_id?: number }> = await wmRes.json();
          if (Array.isArray(wmSources) && wmSources.length > 0) {
            // Prefer IN subscription sources, else any IN source, else fallback to first available
            const inSubSource = wmSources.find(s => s.type === 'sub' && s.region === 'IN');
            const inAnySource = wmSources.find(s => s.region === 'IN');
            const anySubSource = wmSources.find(s => s.type === 'sub');
            
            watchmodeUrl = inSubSource?.web_url || inAnySource?.web_url || anySubSource?.web_url || wmSources[0].web_url;

            // Map Watchmode's direct deep links to our providerList
            providerList.forEach(provider => {
              // Try to find a matching source in Watchmode's response
              const match = wmSources.find(s => {
                const wmName = (s.name || '').toLowerCase();
                const tmdbName = (provider.name || '').toLowerCase();
                // Simple fuzzy match
                return wmName.includes(tmdbName) || tmdbName.includes(wmName);
              });
              
              if (match && match.web_url) {
                provider.link = match.web_url;
              } else if (watchmodeUrl) {
                // Fallback to the primary direct link if no exact provider match
                provider.link = watchmodeUrl;
              }
            });
          }
        }
      } catch (e) {
        console.warn('Failed to fetch watchmode sources', e);
      }
    }

    // Extract Reviews
    const reviews = (movie.reviews?.results ?? []).slice(0, 5).map((r: any) => ({
      author: r.author,
      content: r.content,
      rating: r.author_details?.rating,
      url: r.url,
    }));

    // Extract TV Seasons
    let seasons = undefined;
    let numberOfSeasons = undefined;
    let numberOfEpisodes = undefined;
    
    if (mediaType === 'tv') {
      numberOfSeasons = movie.number_of_seasons;
      numberOfEpisodes = movie.number_of_episodes;
      seasons = (movie.seasons ?? [])
        .filter((s: any) => s.season_number > 0) // usually season 0 is specials
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          seasonNumber: s.season_number,
          episodeCount: s.episode_count,
          airDate: s.air_date,
          overview: s.overview,
          posterUrl: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : '',
        }));
    }

    return {
      id: mediaId,
      imdb_id: imdbId,
      title: movie.title ?? movie.name ?? title,
      year: (movie.release_date || movie.first_air_date) ? (movie.release_date || movie.first_air_date).split('-')[0] : 'N/A',
      runtime: runtimeMin ? `${runtimeMin} min` : (movie.episode_run_time?.[0] ? `${movie.episode_run_time[0]} min` : 'N/A'),
      genre: genres,
      director,
      overview: movie.overview ?? '',
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
      backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '',
      tmdbRating: movie.vote_average ?? 0,
      trailerKey: trailer?.key ?? '',
      watchProviders: providerList,
      watchmodeUrl,
      type: mediaType,
      reviews,
      seasons,
      numberOfSeasons,
      numberOfEpisodes,
    };
  } catch (err) {
    console.error(`TMDB error for "${title}":`, err);
    return null;
  }
}

export async function fetchOmdbRatings(title: string, apiKey: string) {
  const defaults = { imdbRating: 0, rottenTomatoes: 0, metacritic: 0 };
  try {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return defaults;

    const data = await res.json();
    if (data.Response === 'False') return defaults;

    const ratings: Array<{ Source: string; Value: string }> = data.Ratings ?? [];
    const parseRating = (str: string): number => {
      const match = str.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    };

    return {
      imdbRating: parseRating(ratings.find((r) => r.Source === 'Internet Movie Database')?.Value ?? data.imdbRating ?? ''),
      rottenTomatoes: parseRating(ratings.find((r) => r.Source === 'Rotten Tomatoes')?.Value ?? ''),
      metacritic: parseRating(ratings.find((r) => r.Source === 'Metacritic')?.Value ?? ''),
    };
  } catch (err) {
    return defaults;
  }
}

const getCachedTmdbDetails = unstable_cache(
  async (title: string, year: string | undefined, apiKey: string) => fetchTmdbDetails(title, year, apiKey),
  ['tmdb-details'],
  { revalidate: 604800, tags: ['tmdb'] }
);

const getCachedOmdbRatings = unstable_cache(
  async (title: string, apiKey: string) => fetchOmdbRatings(title, apiKey),
  ['omdb-ratings'],
  { revalidate: 604800, tags: ['omdb'] }
);

export async function buildMovieResult(
  extracted: any,
  sourceUrl: string,
  tmdbKey: string | undefined,
  omdbKey: string | undefined
): Promise<any> {
  const title = extracted.title;
  const [tmdb, omdb] = await Promise.all([
    tmdbKey ? getCachedTmdbDetails(title, extracted.year, tmdbKey) : Promise.resolve(null),
    omdbKey ? getCachedOmdbRatings(title, omdbKey) : Promise.resolve({ imdbRating: 0, rottenTomatoes: 0, metacritic: 0 }),
  ]);

  return {
    id: tmdb?.id?.toString() ?? `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: tmdb?.title ?? title,
    imdbId: tmdb?.imdb_id ?? '',
    year: tmdb?.year ?? extracted.year ?? 'N/A',
    runtime: tmdb?.runtime ?? 'N/A',
    genre: tmdb?.genre ?? [],
    director: tmdb?.director ?? 'Unknown',
    overview: tmdb?.overview ?? '',
    posterUrl: tmdb?.posterUrl ?? '',
    backdropUrl: tmdb?.backdropUrl ?? '',
    tmdbRating: tmdb?.tmdbRating ?? 0,
    imdbRating: omdb?.imdbRating ?? 0,
    rottenTomatoes: omdb?.rottenTomatoes ?? 0,
    metacritic: omdb?.metacritic ?? 0,
    trailerKey: tmdb?.trailerKey ?? '',
    watchProviders: tmdb?.watchProviders ?? [],
    watchmodeUrl: tmdb?.watchmodeUrl ?? '',
    sourceUrl,
    moods: extracted.moods ?? [],
    hashtags: extracted.hashtags ?? [],
    confidence: extracted.confidence,
    type: tmdb?.type,
    reviews: tmdb?.reviews,
    seasons: tmdb?.seasons,
    numberOfSeasons: tmdb?.numberOfSeasons,
    numberOfEpisodes: tmdb?.numberOfEpisodes,
  };
}
