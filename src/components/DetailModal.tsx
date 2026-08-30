'use client';

import React, { useEffect, useCallback, useState } from 'react';
import Image from 'next/image';
import {
  X,
  Star,
  Eye,
  EyeOff,
  Trash2,
  Play,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Check,
  MessageSquare,
  Loader2,
  Film,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Movie } from '@/types/movie';
import ReelEmbed from '@/components/ReelEmbed';
import { getDeepLink } from '@/lib/deepLinks';

interface DetailModalProps {
  movie: Movie | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleWatched: (id: string) => void;
}

export default function DetailModal({
  movie,
  onClose,
  onDelete,
  onToggleWatched,
}: DetailModalProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideData, setGuideData] = useState<any>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [isSeasonsOpen, setIsSeasonsOpen] = useState(false);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  const fetchParentalGuide = async () => {
    if (guideData || isLoadingGuide) return;
    setIsLoadingGuide(true);
    setIsGuideOpen(true);
    try {
      const res = await fetch(`/api/parental-guide?title=${encodeURIComponent(movie?.title || '')}&year=${movie?.year || ''}`);
      if (res.ok) {
        const data = await res.json();
        setGuideData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGuide(false);
    }
  };

  const toggleGuide = () => {
    if (!isGuideOpen && !guideData) {
      fetchParentalGuide();
    } else {
      setIsGuideOpen(!isGuideOpen);
    }
  };

  useEffect(() => {
    if (!movie) return;
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [movie, handleEsc]);

  // Instagram Shortcode Extraction
  let igShortcode = '';
  if (movie?.sourceUrl) {
    const match = movie.sourceUrl.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (match && match[1]) igShortcode = match[1];
  }

  // Calculate Match Score based on highest rating
  const highestRating = Math.max(
    movie?.tmdbRating ? movie.tmdbRating * 10 : 0,
    movie?.imdbRating ? movie.imdbRating * 10 : 0,
    movie?.rottenTomatoes || 0,
    movie?.metacritic || 0
  );
  const matchScore = highestRating > 0 ? Math.round(highestRating) : null;

  let primaryWatchLink = movie?.watchmodeUrl || '#';
  let hasValidLink = !!movie?.watchmodeUrl;
  
  if (movie?.watchProviders && movie.watchProviders.length > 0) {
    // 1. Try to find a provider that has a deep link (Netflix, Hulu, etc)
    const providerWithDeepLink = movie.watchProviders.find(p => getDeepLink(p.name, movie?.title || ''));
    
    if (providerWithDeepLink) {
      primaryWatchLink = getDeepLink(providerWithDeepLink.name, movie?.title || '') || '#';
      hasValidLink = true;
    } else {
      // 2. Try to find a provider with a non-TMDB link
      const providerWithDirectLink = movie.watchProviders.find(p => p.link && !p.link.includes('themoviedb.org'));
      if (providerWithDirectLink && providerWithDirectLink.link) {
        primaryWatchLink = providerWithDirectLink.link;
        hasValidLink = true;
      } else if (!hasValidLink && movie.watchProviders[0].link) {
        // 3. Fallback to the first provider's link (which might be TMDB)
        primaryWatchLink = movie.watchProviders[0].link;
        hasValidLink = true;
      }
    }
  }

  return (
    <AnimatePresence>
      {movie && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center overflow-hidden">
          {/* Heavy Cinematic Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-3xl"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="
              relative z-10
              w-full sm:max-w-5xl sm:mx-4
              h-[95vh] sm:h-[90vh]
              overflow-y-auto overscroll-contain custom-scrollbar
              bg-[#050505] rounded-t-[2rem] sm:rounded-[2rem]
              shadow-[0_0_80px_rgba(0,0,0,0.8)]
              border border-white/[0.04]
            "
          >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="
            absolute top-6 right-6 z-30
            h-10 w-10 rounded-full
            bg-black/40 backdrop-blur-xl flex items-center justify-center
            text-white/70 hover:text-white hover:bg-white/20
            transition-all duration-300 border border-white/10
            hover:scale-110 active:scale-95
          "
        >
          <X className="h-5 w-5" />
        </button>

        {/* Hero Header Area */}
        <div className="relative w-full h-[45vh] sm:h-[60vh] min-h-[350px] bg-black overflow-hidden shrink-0">
          {/* Always render the backdrop as a fallback behind the trailer */}
          {movie.backdropUrl && (
            <Image
              src={movie.backdropUrl}
              alt={movie.title}
              fill
              className="object-cover opacity-60"
              priority
            />
          )}
          {movie.trailerKey && (
            <div className="absolute inset-0 pointer-events-none z-0">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${movie.trailerKey}&playsinline=1&vq=hd1080`}
                className="absolute top-1/2 left-1/2 w-[300vw] h-[300vh] sm:w-[150vw] sm:h-[150vw] max-w-none max-h-none -translate-x-1/2 -translate-y-1/2 object-cover pointer-events-none opacity-90"
                allow="autoplay; encrypted-media"
                title={`${movie.title} trailer`}
              />
            </div>
          )}

          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-[#050505]/30 to-transparent" />
          
          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 p-6 sm:p-12 w-full md:w-3/4">
            {movie.year && (
              <span className="text-amber-500 font-bold tracking-widest text-xs uppercase mb-3 block">
                {movie.year}
              </span>
            )}
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter leading-[1.1] drop-shadow-2xl">
              {movie.title}
            </h2>
            
            {/* Meta tags right below title */}
            <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-white/70 font-medium">
              {movie.runtime && (
                <span className="px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md border border-white/5">
                  {movie.runtime}
                </span>
              )}
              {movie.tmdbRating && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md border border-white/5 text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-current" /> {Number(movie.tmdbRating).toFixed(1)}
                </span>
              )}
              {matchScore && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-400 font-bold">
                  {matchScore}% Match
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-6 sm:px-12 pb-12 -mt-4 relative z-10">
          
          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            {/* Watch Movie Button */}
            {hasValidLink && (
              <a
                href={primaryWatchLink}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-base font-bold
                  bg-white text-black hover:bg-neutral-200 hover:scale-105
                  transition-all duration-300 active:scale-95 shadow-xl
                "
              >
                <Play className="h-5 w-5 fill-black" />
                Play
              </a>
            )}

            {movie.sourceUrl && !movie.watchmodeUrl && (!movie.watchProviders || movie.watchProviders.length === 0) && (
              <a
                href={movie.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-base font-bold
                  bg-white/10 backdrop-blur-md text-white hover:bg-white/20
                  border border-white/10
                  transition-all duration-300 active:scale-95 shadow-lg
                "
              >
                <Play className="h-5 w-5" />
                Play Reel
              </a>
            )}

            <button
              onClick={() => onToggleWatched(movie.id)}
              className="
                flex items-center justify-center h-14 w-14 rounded-xl
                border border-white/10 text-white/80
                hover:border-white/30 hover:bg-white/20 hover:text-white
                backdrop-blur-md bg-white/5
                transition-all duration-300 active:scale-95 shadow-lg
              "
              title={movie.watched ? "Mark Unwatched" : "Mark Watched"}
            >
              {movie.watched ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
            </button>

            <button
              onClick={() => {
                onDelete(movie.id);
                onClose();
              }}
              className="
                flex items-center justify-center h-14 w-14 rounded-xl
                border border-white/10 text-white/80
                hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/20
                backdrop-blur-md bg-white/5
                transition-all duration-300 active:scale-95 shadow-lg
              "
              title="Remove from Watchlist"
            >
              <Trash2 className="h-6 w-6" />
            </button>
            
            {/* External Deep Links */}
            <div className="flex gap-3 ml-auto">
              {(movie as any).imdbId && (
                <a
                  href={`https://letterboxd.com/imdb/${(movie as any).imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    flex items-center justify-center h-14 px-6 rounded-xl
                    border border-white/10 text-white/80 font-medium text-sm
                    hover:border-[#00E054]/50 hover:text-[#00E054] hover:bg-[#00E054]/10
                    backdrop-blur-md bg-white/5
                    transition-all duration-300 active:scale-95 shadow-lg
                  "
                  title="Open in Letterboxd"
                >
                  Letterboxd
                </a>
              )}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(movie.title)}+${movie.year && movie.year !== 'N/A' ? movie.year + '+' : ''}${movie.director && movie.director !== 'Unknown' ? encodeURIComponent(movie.director) + '+' : ''}movie`}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex items-center justify-center h-14 px-6 rounded-xl
                  border border-white/10 text-white/80 font-medium text-sm
                  hover:border-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10
                  backdrop-blur-md bg-white/5
                  transition-all duration-300 active:scale-95 shadow-lg
                "
                title="Search Google"
              >
                Google
              </a>
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row gap-8 lg:gap-16">
            {/* Left Column (Main Info) */}
            <div className="flex-1">
              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-3 text-base font-medium mb-4">
                {matchScore !== null && (
                  <span className="text-white font-bold">{matchScore}% Match</span>
                )}
                {movie.year && (
                  <span className="text-white">{movie.year}</span>
                )}
                {movie.runtime && (
                  <span className="text-white">{movie.runtime}</span>
                )}
              </div>

              {/* Overview */}
              <p className="text-[15px] leading-snug text-white/90">
                {movie.overview || 'No synopsis available.'}
              </p>

              {/* Inspiration Context Component */}
              {movie.sourceUrl && (
                <div className="mt-8 border-t border-white/10 pt-6 animate-fadeIn">
                  <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Remind me why I saved this
                  </h3>
                  <a
                    href={movie.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      flex items-center gap-4 p-4 rounded-xl max-w-[400px]
                      bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 hover:border-amber-500/50 
                      transition-all group cursor-pointer shadow-lg
                    "
                  >
                    <div className="h-12 w-12 shrink-0 rounded-full border border-amber-500/30 flex items-center justify-center bg-black group-hover:bg-amber-500/10 transition-colors">
                      <Play className="h-5 w-5 text-amber-500 ml-0.5 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-amber-100 truncate">Play Original Reel</div>
                      <div className="text-xs text-amber-500/70 truncate mt-0.5">Re-experience the inspiration.</div>
                    </div>
                  </a>
                </div>
              )}

              {/* TV Show Seasons Dropdown */}
              {movie.type === 'tv' && movie.seasons && movie.seasons.length > 0 && (
                <div className="mt-8 border-t border-white/10 pt-6">
                  <button 
                    onClick={() => setIsSeasonsOpen(!isSeasonsOpen)}
                    className="w-full flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-bold text-lg">Seasons & Episodes</h3>
                      <span className="text-xs font-medium text-white/50 bg-white/5 px-2 py-1 rounded-md">
                        {movie.numberOfSeasons} Seasons &bull; {movie.numberOfEpisodes} Episodes
                      </span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      {isSeasonsOpen ? <ChevronUp className="h-4 w-4 text-white" /> : <ChevronDown className="h-4 w-4 text-white" />}
                    </div>
                  </button>
                  
                  {isSeasonsOpen && (
                    <div className="mt-4 flex flex-col gap-3 animate-slideUp">
                      {movie.seasons.map((season) => (
                        <div key={season.id} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex gap-4">
                          {season.posterUrl ? (
                            <div className="w-16 h-24 shrink-0 rounded-md overflow-hidden bg-white/5 relative">
                              <Image src={season.posterUrl} alt={season.name} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-24 shrink-0 rounded-md bg-white/5 flex items-center justify-center">
                              <Film className="h-6 w-6 text-white/20" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-base">{season.name}</h4>
                            <div className="text-xs text-white/50 mb-2 mt-1 font-medium">
                              {season.episodeCount} Episodes {season.airDate ? `• ${season.airDate.split('-')[0]}` : ''}
                            </div>
                            <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">
                              {season.overview || 'No overview available.'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Public Reviews */}
              {movie.reviews && movie.reviews.length > 0 && (
                <div className="mt-8 border-t border-white/10 pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MessageSquare className="h-5 w-5 text-amber-500" />
                    <h3 className="text-white font-bold text-lg">Public Reviews</h3>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory hide-scrollbar">
                    {movie.reviews.map((review, i) => (
                      <div key={i} className="snap-start shrink-0 w-[300px] sm:w-[350px] bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">@{review.author}</span>
                          {review.rating && (
                            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-0.5 rounded-full">
                              <Star className="h-3 w-3 fill-amber-500" /> {review.rating}/10
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-white/70 line-clamp-4 leading-relaxed">
                          {review.content}
                        </p>
                        {review.url && (
                          <a href={review.url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-500 font-medium hover:underline mt-auto pt-2 inline-block">
                            Read full review &rarr;
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (Details) */}
            <div className="md:w-[35%] text-[14px] leading-tight flex flex-col gap-4 text-white/60">
              {movie.director && movie.director !== 'Unknown' && (
                <div>
                  <span className="text-white/40">Director: </span>
                  <span className="text-white/90 hover:underline cursor-pointer">{movie.director}</span>
                </div>
              )}
              
              {movie.genre && movie.genre.length > 0 && (
                <div>
                  <span className="text-white/40 block mb-1">Genres: </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Array.isArray(movie.genre) 
                      ? movie.genre.map((g, i) => <span key={i} className="px-2 py-0.5 rounded bg-white/10 text-white/90 text-xs">{g}</span>) 
                      : <span className="px-2 py-0.5 rounded bg-white/10 text-white/90 text-xs">{movie.genre}</span>}
                  </div>
                </div>
              )}
              
              {movie.moods && movie.moods.length > 0 && (
                <div className="mt-2">
                  <span className="text-white/40 block mb-1">Vibe / Mood: </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {movie.moods.map((mood, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-bold tracking-wide shadow-inner">
                        {mood}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {movie.hashtags && movie.hashtags.length > 0 && (
                <div className="mt-2">
                  <span className="text-white/40 block mb-1">Hashtags: </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {movie.hashtags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-500/30 text-fuchsia-200 text-xs font-bold tracking-wide shadow-inner">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ratings */}
              <div className="pt-2">
                <span className="text-white/40 block mb-2">Ratings:</span>
                <div className="flex flex-col gap-2 text-white/90">
                  {movie.tmdbRating ? <div className="flex items-center gap-2"><Star className="h-3 w-3 text-amber-500 fill-amber-500"/> TMDB: {Number(movie.tmdbRating).toFixed(1)}/10</div> : null}
                  {movie.imdbRating ? <div className="flex items-center gap-2"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500"/> IMDb: {Number(movie.imdbRating).toFixed(1)}/10</div> : null}
                  {movie.rottenTomatoes ? <div className="flex items-center gap-2"><span className="text-red-500 font-bold">RT</span> {movie.rottenTomatoes}%</div> : null}
                  {movie.imdbRating && movie.imdb_id ? (
                    <a href={`https://letterboxd.com/imdb/${movie.imdb_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#00E054] hover:underline hover:brightness-110 transition-all w-fit">
                      <div className="h-3 w-3 rounded-[2px] bg-[#00E054] flex items-center justify-center"><div className="h-1.5 w-1.5 rounded-full bg-black"></div></div>
                      Letterboxd
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Watch Providers */}
              {movie.watchProviders && movie.watchProviders.length > 0 && (
                <div className="pt-2">
                  <span className="text-white/40 block mb-2">Available On:</span>
                  <div className="flex flex-wrap gap-2">
                    {movie.watchProviders.map((p) => {
                      // Prefer a direct deep link if we mapped it, otherwise fallback to watchmodeUrl instead of TMDB link
                      const deepLink = getDeepLink(p.name, movie.title);
                      const finalLink = deepLink || ((p.link && !p.link.includes('themoviedb.org')) ? p.link : (movie.watchmodeUrl || p.link));
                      const Wrapper = finalLink ? 'a' : 'div';
                      return (
                        <Wrapper
                          key={p.name}
                          href={finalLink}
                          target={finalLink ? "_blank" : undefined}
                          rel={finalLink ? "noopener noreferrer" : undefined}
                          className="h-8 w-8 rounded overflow-hidden bg-[#0a0a0a] relative cursor-pointer hover:scale-110 transition-transform block"
                          title={p.name}
                        >
                          <Image
                            src={p.logoUrl}
                            alt={p.name}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        </Wrapper>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Parental Guide */}
              <div className="pt-4 mt-2 border-t border-white/10">
                <button
                  onClick={toggleGuide}
                  className="flex items-center justify-between w-full text-left group"
                >
                  <div className="flex items-center gap-2 text-white/90 font-semibold group-hover:text-white transition-colors">
                    <ShieldAlert className="h-4 w-4" />
                    IMDb Parental Guide
                  </div>
                  {isGuideOpen ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
                </button>
                
                {isGuideOpen && (
                  <div className="mt-4 space-y-4 text-sm animate-fadeIn">
                    {isLoadingGuide ? (
                      <div className="flex items-center gap-2 text-white/50">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating guide...
                      </div>
                    ) : guideData ? (
                      <div className="space-y-3">
                        {[
                          { key: 'sexAndNudity', label: 'Sex & Nudity' },
                          { key: 'violenceAndGore', label: 'Violence & Gore' },
                          { key: 'profanity', label: 'Profanity' },
                          { key: 'alcoholAndDrugs', label: 'Alcohol & Drugs' },
                          { key: 'frightening', label: 'Frightening' }
                        ].map(({ key, label }) => {
                          const item = guideData[key];
                          if (!item) return null;
                          const sev = item.severity.toLowerCase();
                          let color = 'text-green-400 bg-green-400/10';
                          if (sev.includes('mild')) color = 'text-yellow-400 bg-yellow-400/10';
                          else if (sev.includes('moderate')) color = 'text-orange-400 bg-orange-400/10';
                          else if (sev.includes('severe')) color = 'text-red-400 bg-red-400/10';
                          
                          return (
                            <div key={key} className="bg-[#0a0a0a] rounded-lg p-3 border border-white/5">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-white/80">{label}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${color}`}>
                                  {item.severity}
                                </span>
                              </div>
                              <p className="text-white/50 text-xs leading-relaxed">{item.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-red-400/80 text-xs">Failed to load guide.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Instagram Reel Embed */}
              {movie.sourceUrl && movie.sourceUrl.includes('instagram.com') && (
                <div className="pt-4 mt-2 border-t border-white/10">
                  <ReelEmbed sourceUrl={movie.sourceUrl} />
                </div>
              )}
            </div>
          </div>
        </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
