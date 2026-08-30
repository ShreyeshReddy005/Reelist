'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Link2,
  Loader2,
  Globe,
  Brain,
  Film,
  CheckCircle,
  AlertCircle,
  Plus,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Movie } from '@/types/movie';
import ReelEmbed from '@/components/ReelEmbed';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (movies: Movie[]) => void;
  initialUrl?: string;
}

type ExtractionStep = 'idle' | 'scraping' | 'analyzing' | 'fetching' | 'done' | 'error';

const STEP_CONFIG: Record<
  ExtractionStep,
  { label: string; icon: React.ReactNode; color: string }
> = {
  idle: { label: '', icon: null, color: '' },
  scraping: {
    label: 'Scraping reel content...',
    icon: <Globe className="h-4 w-4" />,
    color: 'text-neutral-400',
  },
  analyzing: {
    label: 'Analyzing with AI...',
    icon: <Brain className="h-4 w-4" />,
    color: 'text-neutral-400',
  },
  fetching: {
    label: 'Fetching movie details...',
    icon: <Film className="h-4 w-4" />,
    color: 'text-neutral-400',
  },
  done: {
    label: 'Movie found!',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-white',
  },
  error: {
    label: 'Extraction failed',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-500',
  },
};

const ROTATING_TEXTS = [
  "Looking at the link...",
  "Extracting reel content...",
  "Analyzing with AI...",
  "Detecting movie titles...",
  "Getting related info...",
];

function RotatingTextLoader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % ROTATING_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 overflow-hidden relative">
      <div 
        className="transition-transform duration-500 ease-in-out flex flex-col items-center"
        style={{ transform: `translateY(-${index * 24}px)` }}
      >
        {ROTATING_TEXTS.map((text, i) => (
          <span key={i} className="h-[24px] flex items-center text-sm font-medium text-white tracking-wide">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ImportModal({
  isOpen,
  onClose,
  onImport,
  initialUrl = '',
}: ImportModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<ExtractionStep>('idle');
  const [extractedMovies, setExtractedMovies] = useState<Partial<Movie>[]>([]);
  
  // Track if we've auto-submitted for this open instance
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEsc]);

  const handleClose = () => {
    setUrl('');
    setError('');
    setStep('idle');
    setExtractedMovies([]);
    setHasAutoSubmitted(false);
    onClose();
  };

  const processUrl = async (targetUrl: string, runId?: string) => {
    if (!runId) {
      setError('');
      if (!targetUrl.trim()) {
        setError('Please enter a Reel URL or movie title');
        return;
      }
      setStep('scraping');
      if (navigator.vibrate) navigator.vibrate(10);
    }

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runId ? { runId } : { url: targetUrl.trim() }),
      });

      if (response.status === 202) {
        const data = await response.json();
        if (data.status === 'polling' && data.runId) {
          setTimeout(() => {
            processUrl(targetUrl, data.runId);
          }, 3000);
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        if (navigator.vibrate) navigator.vibrate([10, 30, 10]); // Success double-tap
        
        const moviesToProcess = data.movies && data.movies.length > 0 ? data.movies : (data.movie ? [data.movie] : []);
        
        if (moviesToProcess.length > 0) {
          const finalMovies: Movie[] = moviesToProcess.map((extractedMovie: Partial<Movie>) => ({
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            title: extractedMovie.title || 'Unknown',
            year: extractedMovie.year,
            runtime: extractedMovie.runtime,
            genre: extractedMovie.genre,
            director: extractedMovie.director,
            overview: extractedMovie.overview,
            posterUrl: extractedMovie.posterUrl,
            backdropUrl: extractedMovie.backdropUrl,
            tmdbRating: extractedMovie.tmdbRating,
            imdbRating: extractedMovie.imdbRating,
            rottenTomatoes: extractedMovie.rottenTomatoes,
            metacritic: extractedMovie.metacritic,
            trailerKey: extractedMovie.trailerKey,
            imdb_id: extractedMovie.imdb_id,
            watchProviders: extractedMovie.watchProviders,
            sourceUrl: targetUrl.trim() || undefined,
            addedAt: new Date().toISOString(),
            watched: false,
            queue: (extractedMovie.imdbRating && extractedMovie.imdbRating >= 7) ? 'watchlist' : 'review',
          }));
          
          onImport(finalMovies);
          setExtractedMovies(moviesToProcess);
          setStep('done');
          return;
        } else {
          setError('Could not identify any movies in this Reel.');
          setStep('idle');
          if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
          return;
        }
      } else {
        const rawText = await response.text();
        let errData;
        try {
          errData = JSON.parse(rawText);
        } catch(e) {}
        
        setError(errData?.error || `Server returned ${response.status}: ${rawText.slice(0, 50)}`);
        setStep('idle');
        if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
        return;
      }
    } catch {
      setError('Network error or server is unavailable');
      setStep('idle');
      if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
    }
  };

  useEffect(() => {
    if (isOpen && initialUrl && !hasAutoSubmitted) {
      setUrl(initialUrl);
      setHasAutoSubmitted(true);
      processUrl(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialUrl, hasAutoSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processUrl(url);
  };

  const isProcessing =
    step === 'scraping' || step === 'analyzing' || step === 'fetching';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-3xl"
            onClick={!isProcessing ? handleClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="
              relative z-10
              w-full sm:max-w-lg sm:mx-4
              max-h-[90vh] overflow-y-auto
              bg-black sm:bg-[#0a0a0a]/90 sm:backdrop-blur-3xl
              border-t sm:border border-white/[0.08]
              rounded-t-3xl sm:rounded-3xl
              shadow-2xl
            "
          >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isProcessing}
          className="
            absolute top-4 right-4 z-20
            h-8 w-8 rounded-full
            bg-white/[0.06] hover:bg-white/[0.1]
            flex items-center justify-center
            text-slate-500 hover:text-white
            transition-all disabled:opacity-50
          "
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white tracking-[-0.02em]">
              Import from Reel
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Paste a link and we&apos;ll find the movie for you
            </p>
          </div>

          {/* URL Input */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                placeholder="https://www.instagram.com/reel/..."
                disabled={isProcessing || step === 'done'}
                className="
                  w-full h-12
                  bg-white/[0.04] border border-[#262626]
                  focus:border-white/20 focus:bg-white/[0.06]
                  focus:outline-none focus:ring-1 focus:ring-white/10
                  rounded-xl pl-10 pr-4
                  text-sm text-neutral-200 placeholder-neutral-600
                  transition-all duration-200
                  disabled:opacity-50
                "
              />
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-red-400 text-xs mt-2">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}

            {/* Submit or processing state */}
            {step === 'idle' && (
              <button
                type="submit"
                className="
                  w-full mt-4 h-11
                  bg-white hover:bg-neutral-200
                  text-black font-semibold text-sm
                  rounded-xl transition-all duration-150
                  active:scale-[0.98]
                "
              >
                Extract Movie
              </button>
            )}
          </form>

          {/* Progress loader */}
          {(isProcessing || step === 'done') && (
            <div className="mt-8 relative transition-all duration-700 ease-in-out">
              {/* Siri / Apple Intelligence Style Orb UI */}
              {isProcessing && (
                <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto py-8 relative">
                  
                  {/* The Glowing Orb */}
                  <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                    {/* Outer slow spinning glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-[24px] animate-spin-slow opacity-60 scale-125 pointer-events-none"></div>
                    {/* Inner reverse spinning glow */}
                    <div className="absolute inset-2 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-full blur-[20px] animate-reverse-spin opacity-70 scale-110 pointer-events-none"></div>
                    {/* Pulsing core */}
                    <div className="absolute inset-4 bg-gradient-to-bl from-fuchsia-500 via-pink-400 to-amber-300 rounded-full blur-[12px] mix-blend-screen animate-pulse-slow pointer-events-none"></div>
                    
                    {/* Glassy shell */}
                    <div className="absolute inset-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"></div>
                    
                    <Brain className="relative z-10 w-8 h-8 text-white/90 drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] animate-pulse-slow" />
                  </div>

                  <div className="relative z-10 opacity-90 mb-6">
                    <RotatingTextLoader />
                  </div>
                  
                  {/* Instant oEmbed Preview to mask loading time */}
                  <div className="relative z-10 w-full animate-fadeIn max-h-[40vh] overflow-hidden flex justify-center">
                     <ReelEmbed sourceUrl={url} />
                  </div>
                </div>
              )}

              {/* Done State */}
              {step === 'done' && (
                <div className="flex flex-col items-center gap-6 animate-fadeIn">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <span className="text-emerald-400 font-medium tracking-wide">Successfully Added!</span>
                  </div>

                  {/* Restored Movie Preview without Add Buttons */}
                  {extractedMovies.length > 0 && (
                    <div className="w-full space-y-3">
                      {extractedMovies.map((extractedMovie, index) => (
                        <div key={index} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex items-center gap-4">
                          <div className="shrink-0 w-12 aspect-[2/3] rounded-md overflow-hidden bg-[#0a0a0a] relative">
                            {extractedMovie.posterUrl && (
                              <Image src={extractedMovie.posterUrl} alt={extractedMovie.title || ''} fill sizes="48px" className="object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white text-sm truncate">{extractedMovie.title}</h3>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              {extractedMovie.year && <span>{extractedMovie.year}</span>}
                              {extractedMovie.tmdbRating && (
                                <span className="flex items-center gap-1 text-amber-400/80">
                                  <Star className="h-2.5 w-2.5 fill-current" /> {Number(extractedMovie.tmdbRating).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleClose}
                    className="mt-2 px-6 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No extracted movies preview needed as they are auto-added */}
        </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
