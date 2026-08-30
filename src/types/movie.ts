export interface Movie {
  id: string;
  title: string;
  year?: string;
  runtime?: string;
  genre?: string[];
  director?: string;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  tmdbRating?: number;
  imdbRating?: number;
  rottenTomatoes?: number;
  metacritic?: number;
  trailerKey?: string;
  hashtags?: string[];
  imdb_id?: string;
  watchProviders?: WatchProvider[];
  watchmodeUrl?: string;
  sourceUrl?: string;
  addedAt: string;
  watched: boolean;
  queue?: 'review' | 'watchlist';
  type?: 'movie' | 'tv';
  moods?: string[];
  reviews?: Review[];
  seasons?: Season[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  recommendedBy?: {
    userId: string;
    name: string;
    photoUrl?: string;
  };
}

export interface Review {
  author: string;
  content: string;
  rating?: number;
  url?: string;
}

export interface Season {
  id: number;
  name: string;
  seasonNumber: number;
  episodeCount: number;
  airDate?: string;
  overview?: string;
  posterUrl?: string;
}
export interface WatchProvider {
  name: string;
  logoUrl: string;
  link?: string;
}

export type SortOption = 'newest' | 'oldest' | 'topRated' | 'recentRelease';
export type StatusFilter = 'all' | 'unwatched' | 'watched';
