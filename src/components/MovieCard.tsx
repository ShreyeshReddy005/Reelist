'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Star, Eye, Trash2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Movie } from '@/types/movie';
import ShareButton from './ShareButton';

interface MovieCardProps {
  movie: Movie;
  onDelete?: (id: string) => void;
  onClick: (movie: Movie) => void;
  onToggleWatched?: (id: string) => void;
  isReviewMode?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const MovieCard = React.memo(function MovieCard({
  movie,
  onDelete,
  onClick,
  onToggleWatched,
  isReviewMode,
  onApprove,
  onReject,
}: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const rating = movie.tmdbRating || movie.imdbRating;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="
        group relative flex flex-col cursor-pointer
        rounded-2xl
        bg-[#050505] border border-white/5
        active:scale-[0.97]
      "
      onClick={() => onClick(movie)}
    >
      {/* Ambient Apple TV Style Glow (spills outside because root has no overflow-hidden) */}
      {movie.posterUrl && !imgError && (
        <div className="absolute inset-0 z-[-1] opacity-0 lg:group-hover:opacity-100 transition-opacity duration-700 ease-out rounded-2xl pointer-events-none">
          <Image
            src={movie.posterUrl}
            alt=""
            fill
            sizes="100px"
            className="object-cover blur-[40px] scale-[1.15] saturate-200"
          />
        </div>
      )}

      {/* Poster Container — 2:3 ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0a0a0a] rounded-2xl border border-white/5 group-hover:border-white/20 transition-colors duration-500">
        {/* Skeleton shimmer while loading */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 bg-neutral-900 animate-pulse" />
        )}

        {movie.posterUrl && !imgError ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className={`
              object-cover
              transition-transform duration-700 ease-out
              group-hover:scale-[1.08] group-hover:rotate-1
              ${imgLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-600 bg-[#0a0a0a]">
            <Star className="h-8 w-8 text-neutral-800" />
            <span className="text-xs font-medium">No Poster</span>
          </div>
        )}

        {/* Gradient Overlay (Always dark at bottom for mobile text, darkens fully on lg hover) */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 z-10"
        />

        {/* Rating badge — top right */}
        {rating && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-xl px-2.5 py-1.5 rounded-lg border border-white/10 shadow-lg transition-transform duration-300 group-hover:scale-105">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <span className="text-xs font-bold text-white tabular-nums drop-shadow-md">
              {typeof rating === 'number' ? rating.toFixed(1) : rating}
            </span>
          </div>
        )}

        {/* Top left badges container */}
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-2 items-start">
          {movie.watched && (
            <div className="flex items-center gap-1.5 bg-emerald-500/80 backdrop-blur-xl px-2.5 py-1.5 rounded-lg border border-white/20 shadow-lg">
              <Eye className="h-3.5 w-3.5 text-white drop-shadow-md" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-md">
                Watched
              </span>
            </div>
          )}
          {movie.recommendedBy && (
            <div className="flex items-center gap-1.5 bg-primary/80 backdrop-blur-xl px-2.5 py-1.5 rounded-lg border border-white/20 shadow-lg shadow-primary/30" title={`Recommended by ${movie.recommendedBy.name}`}>
              {movie.recommendedBy.photoUrl ? (
                <Image src={movie.recommendedBy.photoUrl} alt="" width={14} height={14} unoptimized className="w-3.5 h-3.5 rounded-full" />
              ) : (
                <Star className="h-3.5 w-3.5 text-white drop-shadow-md" />
              )}
              <span className="text-[10px] font-bold text-white tracking-wider drop-shadow-md max-w-[80px] truncate">
                By {movie.recommendedBy.name}
              </span>
            </div>
          )}
        </div>

        {/* Hover action overlay with staggered micro-animations */}
        <div
          className="
            absolute inset-0 hidden lg:flex items-center justify-center gap-4
            bg-black/40 backdrop-blur-sm z-20
            opacity-0 group-hover:opacity-100
            transition-all duration-300 ease-out
          "
          onClick={(e) => e.stopPropagation()}
        >
          {isReviewMode ? (
            <>
              {/* Reject Button (Slides from left) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReject?.(movie.id);
                  if (navigator.vibrate) navigator.vibrate(50);
                }}
                className="
                  flex items-center justify-center
                  h-12 w-12 rounded-full
                  bg-red-500/10 hover:bg-red-500/90
                  border border-red-500/30 hover:border-red-400
                  text-red-400 hover:text-white
                  text-white transition-all duration-300 ease-out
                  hover:scale-110 active:scale-90
                  hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]
                  transform translate-x-0 lg:-translate-x-4 lg:group-hover:translate-x-0
                  opacity-100 lg:opacity-0 lg:group-hover:opacity-100
                  delay-75
                "
                title="Reject"
              >
                <X className="h-6 w-6 stroke-[2.5]" />
              </button>

              {/* Approve Button (Slides from right) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove?.(movie.id);
                  if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
                }}
                className="
                  flex items-center justify-center
                  h-14 w-14 rounded-full
                  bg-emerald-500/10 hover:bg-emerald-500/90
                  border border-emerald-500/30 hover:border-emerald-400
                  text-emerald-400 hover:text-white
                  text-white transition-all duration-300 ease-out
                  hover:scale-110 active:scale-90
                  hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]
                  transform translate-x-0 lg:translate-x-4 lg:group-hover:translate-x-0
                  opacity-100 lg:opacity-0 lg:group-hover:opacity-100
                  delay-100
                "
                title="Approve to Watchlist"
              >
                <Check className="h-7 w-7 stroke-[2.5]" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWatched?.(movie.id);
                  if (navigator.vibrate) navigator.vibrate(20);
                }}
                className="
                  flex items-center justify-center
                  h-12 w-12 rounded-full
                  bg-white/5 hover:bg-emerald-500/90
                  border border-white/10 hover:border-emerald-400/50
                  text-white transition-all duration-300 ease-out
                  hover:scale-110 active:scale-90
                  hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]
                  transform translate-y-0 lg:translate-y-4 lg:group-hover:translate-y-0
                  opacity-100 lg:opacity-0 lg:group-hover:opacity-100
                  delay-75
                  backdrop-blur-md
                "
                title={movie.watched ? 'Mark as unwatched' : 'Mark as watched'}
              >
                <Eye className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(movie.id);
                  if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
                }}
                className="
                  flex items-center justify-center
                  h-12 w-12 rounded-full
                  bg-white/5 hover:bg-red-500/90
                  border border-white/10 hover:border-red-400/50
                  text-white transition-all duration-300 ease-out
                  hover:scale-110 active:scale-90
                  hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]
                  transform translate-y-0 lg:translate-y-4 lg:group-hover:translate-y-0
                  opacity-100 lg:opacity-0 lg:group-hover:opacity-100
                  delay-100
                  backdrop-blur-md
                "
                title="Delete from watchlist"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <ShareButton 
                movie={movie} 
                className="
                  flex items-center justify-center !p-0
                  h-12 w-12 rounded-full
                  bg-white/5 hover:bg-primary/90 hover:!text-white
                  border border-white/10 hover:border-primary/50
                  text-white transition-all duration-300 ease-out
                  hover:scale-110 active:scale-90
                  hover:shadow-[0_0_20px_rgba(255,0,128,0.4)]
                  transform translate-y-0 lg:translate-y-4 lg:group-hover:translate-y-0
                  opacity-100 lg:opacity-0 lg:group-hover:opacity-100
                  delay-150
                  backdrop-blur-md
                "
              />
            </>
          )}
        </div>

        {/* Sleek Overlay Info (Always visible on mobile, slides up on lg hover) */}
        <div 
          className="
            absolute inset-x-0 bottom-0 p-4 flex flex-col gap-1.5
            transform translate-y-0 lg:translate-y-4 lg:group-hover:translate-y-0
            opacity-100 lg:opacity-0 lg:group-hover:opacity-100
            transition-all duration-300 ease-out z-20
          "
        >
          <h3 className="font-bold text-sm sm:text-base text-white drop-shadow-lg line-clamp-2 leading-tight">
            {movie.title}
          </h3>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-white/80 font-medium drop-shadow-md">
            {movie.year && <span>{movie.year}</span>}
            {movie.year && movie.genre && movie.genre.length > 0 && (
              <span className="w-1 h-1 rounded-full bg-white/40" />
            )}
            {movie.genre && movie.genre.length > 0 && (
              <span className="line-clamp-1">
                {Array.isArray(movie.genre) ? movie.genre.slice(0, 2).join(', ') : movie.genre}
              </span>
            )}
          </div>
          {movie.watchProviders && movie.watchProviders.length > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {movie.watchProviders.slice(0, 3).map(p => {
                const finalLink = (p.link && !p.link.includes('themoviedb.org')) ? p.link : (movie.watchmodeUrl || p.link);
                return (
                  <a 
                    key={p.name}
                    href={finalLink || '#'}
                    target={finalLink ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded-[4px] overflow-hidden bg-black/50 hover:scale-110 transition-transform shadow-md border border-white/10"
                    title={`Watch on ${p.name}`}
                  >
                    <Image src={p.logoUrl} alt={p.name} width={20} height={20} unoptimized className="w-full h-full object-cover" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default MovieCard;
