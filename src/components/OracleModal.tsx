'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Play, RefreshCw } from 'lucide-react';
import { Movie } from '@/types/movie';
import Image from 'next/image';

interface OracleModalProps {
  isOpen: boolean;
  onClose: () => void;
  movies: Movie[];
}

export default function OracleModal({ isOpen, onClose, movies }: OracleModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter unwatched movies
  const candidates = movies.filter(m => m.queue !== 'review' && !m.watched);

  useEffect(() => {
    if (isOpen) {
      if (candidates.length > 0) {
        startSpin();
      } else {
        setHasLanded(true); // No movies to spin
      }
    } else {
      // Reset state when closed
      setIsSpinning(false);
      setHasLanded(false);
      setSelectedMovie(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startSpin = () => {
    if (candidates.length === 0) return;
    
    setIsSpinning(true);
    setHasLanded(false);
    setSelectedMovie(null);
    
    // Pick the winner right away
    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const winner = candidates[winnerIndex];

    let spinCount = 0;
    const maxSpins = 30; // Number of rapid cycles before stopping
    
    if (navigator.vibrate) navigator.vibrate(50);

    timerRef.current = setInterval(() => {
      setCurrentIndex(Math.floor(Math.random() * candidates.length));
      spinCount++;
      
      // Haptic feedback for each tick (if supported)
      if (spinCount % 3 === 0 && navigator.vibrate) {
        navigator.vibrate(10);
      }

      if (spinCount >= maxSpins) {
        if (timerRef.current) clearInterval(timerRef.current);
        setSelectedMovie(winner);
        setIsSpinning(false);
        setHasLanded(true);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Success haptic
      }
    }, 100); // 100ms per tick
  };

  if (!isOpen) return null;

  // Safe fallback if the array gets mutated while spinning
  const displayMovie = selectedMovie || (candidates.length > 0 ? candidates[currentIndex] : null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Preload images to prevent spin lag */}
      <div className="hidden">
        {candidates.map(c => c.posterUrl && (
          <Image key={c.id} src={c.posterUrl} alt="" width={10} height={10} unoptimized priority />
        ))}
      </div>
      
      {/* Blurred Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/80 transition-all duration-1000 ${hasLanded ? 'backdrop-blur-xl' : 'backdrop-blur-sm'}`}
        onClick={onClose}
      />

      {/* Dynamic Aura Background */}
      {hasLanded && selectedMovie?.backdropUrl && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 opacity-30">
          <Image 
            src={selectedMovie.backdropUrl} 
            alt="" 
            fill 
            className="object-cover blur-3xl"
            unoptimized
            priority
          />
        </div>
      )}

      {/* Modal Content */}
      <div className={`relative z-10 w-full max-w-lg flex flex-col items-center text-center transition-all duration-700 ${hasLanded ? 'scale-100 opacity-100' : 'scale-95 opacity-90'}`}>
        
        {/* Header Title */}
        <h2 className={`text-3xl sm:text-5xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary via-fuchsia-400 to-purple-400 transition-all duration-700 ${hasLanded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-50'}`}>
          {hasLanded ? "The Oracle Has Spoken" : "Consulting the Oracle..."}
        </h2>

        {candidates.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">No Unwatched Movies</h3>
            <p className="text-white/60">Your watchlist is completely clear. Time to import something new!</p>
            <button 
              onClick={onClose}
              className="mt-6 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all active:scale-95"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative group">
            {/* Poster Frame */}
            <div className={`relative w-64 sm:w-72 aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 ${isSpinning ? 'blur-[2px] scale-95' : 'blur-0 scale-100 shadow-[0_0_50px_rgba(255,0,128,0.3)]'}`}>
              {displayMovie?.posterUrl ? (
                <Image 
                  src={displayMovie.posterUrl} 
                  alt={displayMovie.title || 'Movie Poster'} 
                  fill 
                  unoptimized
                  priority
                  className={`object-cover transition-transform duration-75 ${isSpinning ? 'scale-110' : 'scale-100'}`} 
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center text-white/20 font-bold text-2xl">
                  {displayMovie?.title}
                </div>
              )}
              
              {/* Overlay for spinning state */}
              {isSpinning && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <RefreshCw className="w-12 h-12 text-primary animate-spin" />
                </div>
              )}
            </div>

            {/* Revealed Movie Details */}
            <div className={`mt-8 transition-all duration-700 ${hasLanded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-lg">
                {displayMovie?.title}
              </h3>
              
              <div className="flex items-center justify-center gap-3 text-white/70 text-sm font-medium mb-8">
                {displayMovie?.year && <span>{displayMovie.year}</span>}
                {displayMovie?.runtime && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    <span>{displayMovie.runtime}</span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              {displayMovie && hasLanded && (
                <div className="flex flex-col gap-3">
                  {/* Primary Streaming Link (if available) */}
                  {(displayMovie.watchmodeUrl || (displayMovie.watchProviders && displayMovie.watchProviders.length > 0)) && (
                    <a
                      href={displayMovie.watchmodeUrl || displayMovie.watchProviders?.[0]?.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-bold rounded-xl transition-transform active:scale-95 shadow-xl"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      Watch Now
                    </a>
                  )}
                  
                  {/* Fallback to Reel if no streaming links */}
                  {displayMovie.sourceUrl && !displayMovie.watchmodeUrl && (!displayMovie.watchProviders || displayMovie.watchProviders.length === 0) && (
                    <a
                      href={displayMovie.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-500/90 hover:to-orange-500/90 text-white font-bold rounded-xl transition-transform active:scale-95 shadow-xl"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      Play Original Reel
                    </a>
                  )}

                  {/* Respin Button */}
                  <button
                    onClick={startSpin}
                    className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all active:scale-95 border border-white/5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Spin Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Close Button (Top Right) */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-black/60 hover:bg-white/20 border border-white/10 rounded-full text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95 z-50"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  );
}
