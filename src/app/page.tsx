'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles, Link2, AlertCircle, Clipboard, Star, Loader2, Eye, Film, ChevronRight,
} from 'lucide-react';
import Header from '@/components/Header';
import ExtractionSplash from '@/components/ExtractionSplash';
import BottomNav from '@/components/BottomNav';
import { SkeletonHero } from '@/components/Skeleton';
import dynamic from 'next/dynamic';

const ImportModal = dynamic(() => import('@/components/ImportModal'), { ssr: false });
const DetailModal = dynamic(() => import('@/components/DetailModal'), { ssr: false });
const BugReportModal = dynamic(() => import('@/components/BugReportModal'), { ssr: false });
const IosSetupModal = dynamic(() => import('@/components/IosSetupModal'), { ssr: false });
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/components/Toast';
import type { Movie } from '@/types/movie';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// ── Mood Cards Data ──────────────────────────────────────────────────────────

const MOODS = [
  { id: 'Late Night Vibes', emoji: '🌙', gradient: 'from-indigo-600/20 to-violet-600/20', border: 'border-indigo-500/20', glow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]' },
  { id: 'Brain Empty Just Explosions', emoji: '💥', gradient: 'from-orange-600/20 to-red-600/20', border: 'border-orange-500/20', glow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]' },
  { id: 'Crying in Bed', emoji: '😭', gradient: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/20', glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]' },
  { id: 'Mindfuck', emoji: '🧠', gradient: 'from-fuchsia-600/20 to-pink-600/20', border: 'border-fuchsia-500/20', glow: 'hover:shadow-[0_0_30px_rgba(217,70,239,0.15)]' },
  { id: 'Comfort Watch', emoji: '☕', gradient: 'from-amber-600/20 to-yellow-600/20', border: 'border-amber-500/20', glow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]' },
  { id: 'Aesthetic', emoji: '✨', gradient: 'from-rose-600/20 to-pink-600/20', border: 'border-rose-500/20', glow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]' },
  { id: 'Lock In', emoji: '🔒', gradient: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/20', glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]' },
  { id: 'Good Vibes Only', emoji: '☀️', gradient: 'from-yellow-600/20 to-lime-600/20', border: 'border-yellow-500/20', glow: 'hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]' },
];

export default function HomePage() {
  const { movies, mounted, addMovies, reloadWatchlist } = useWatchlist();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isIosSetupOpen, setIsIosSetupOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [heroUrl, setHeroUrl] = useState('');
  const [heroError, setHeroError] = useState('');
  const [splashUrl, setSplashUrl] = useState('');
  const [activeMood, setActiveMood] = useState<string | null>(null);

  const { showToast } = useToast();

  // Handle Web Share Target
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedTitle = urlParams.get('title') || '';
      const sharedText = urlParams.get('text') || '';
      const sharedUrl = urlParams.get('url') || '';
      const combined = `${sharedTitle} ${sharedText} ${sharedUrl}`;
      const urlMatch = combined.match(/https?:\/\/(?:www\.)?instagram\.com\S+/i);
      if (urlMatch?.[0]) {
        const cleanUrl = urlMatch[0].replace(/[.,)"'\]]+$/, '');
        setSplashUrl(cleanUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Movie of the Day — deterministic daily pick
  const movieOfTheDay = useMemo(() => {
    if (movies.length === 0) return null;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash = hash & hash;
    }
    return movies[Math.abs(hash) % movies.length];
  }, [movies]);

  // Quick stats
  const totalCount = movies.filter(m => m.queue !== 'review').length;
  const watchedThisMonth = useMemo(() => {
    const now = new Date();
    return movies.filter(m => m.watched && m.addedAt && new Date(m.addedAt).getMonth() === now.getMonth()).length;
  }, [movies]);

  // Mood-filtered movies
  const moodMovies = useMemo(() => {
    if (!activeMood) return [];
    return movies.filter(m => m.moods?.includes(activeMood) && m.queue !== 'review');
  }, [movies, activeMood]);

  // Mood counts for badges
  const moodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    movies.forEach(m => { if (m.queue !== 'review' && m.moods) m.moods.forEach(mood => counts.set(mood, (counts.get(mood) || 0) + 1)); });
    return counts;
  }, [movies]);

  // Handlers
  const handleHeroSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!heroUrl.trim()) { setHeroError('Paste an Instagram Reel URL'); return; }
    if (!/instagram\.com/i.test(heroUrl)) { setHeroError('Please enter a valid Instagram URL'); return; }
    setHeroError('');
    setIsImportOpen(true);
  }, [heroUrl]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const urlMatch = text.match(/https?:\/\/(?:www\.)?instagram\.com\S+/i);
      if (urlMatch?.[0]) { 
        const cleanUrl = urlMatch[0].replace(/[.,)"'\]]+$/, '');
        setHeroUrl(cleanUrl); 
        if (navigator.vibrate) navigator.vibrate(20); 
        setIsImportOpen(true); 
      }
      else { showToast('No Instagram URL found in clipboard', 'error'); }
    } catch { showToast('Clipboard access denied', 'error'); }
  }, [showToast]);

  const handleImport = async (newMovies: Movie[]) => {
    await addMovies(newMovies);
    showToast(`Added ${newMovies.length} movie${newMovies.length !== 1 ? 's' : ''}!`, 'success');
  };

  if (!mounted || authLoading) return <div className="min-h-screen bg-background flex flex-col items-center justify-center"><Loader2 className="h-8 w-8 text-amber-500 animate-spin mb-4" /><span className="text-sm text-slate-500">Loading...</span></div>;
  if (!user) return null;

  if (splashUrl) return <ExtractionSplash initialUrl={splashUrl} onComplete={() => { setSplashUrl(''); reloadWatchlist(); }} />;

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col pb-20 lg:pb-0">
        <Header onOpenBugReport={() => setIsBugReportOpen(true)} />

        <main className="flex-1">
          {/* ── Cinematic Hero ── */}
          <section className="relative w-full min-h-[85vh] flex flex-col justify-end pb-12 sm:pb-24 pt-[30vh]">
            {/* Backdrop */}
            {movieOfTheDay?.backdropUrl ? (
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-cover bg-top animate-fadeIn opacity-0" style={{ backgroundImage: `url(${movieOfTheDay.backdropUrl})`, animationDuration: '1.5s' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent animate-fadeIn opacity-0" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/20 to-transparent animate-fadeIn opacity-0" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 bg-black/20 animate-fadeIn opacity-0" style={{ animationDuration: '1.5s' }} />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
              </div>
            ) : (
              <>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/[0.05] rounded-full blur-[120px] pointer-events-none animate-fadeIn" style={{ animationDuration: '2s' }} />
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none animate-fadeIn" style={{ animationDuration: '2.5s' }} />
              </>
            )}

            <div className={`relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col ${movies.length > 0 ? 'items-center sm:items-start text-center sm:text-left' : 'items-center text-center'}`}>
              {movieOfTheDay && (
                <div className="mb-6 flex flex-col gap-2 cursor-pointer group w-fit" onClick={() => setSelectedMovie(movieOfTheDay)}>
                  <span className="text-xs font-bold tracking-widest text-amber-500 uppercase flex items-center gap-2 justify-center sm:justify-start animate-slideUp" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
                    <Sparkles className="h-3 w-3" /> Movie of the Day
                  </span>
                  <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight text-balance max-w-2xl drop-shadow-xl animate-slideUp group-hover:text-amber-400 transition-colors" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                    {movieOfTheDay.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/80 font-medium justify-center sm:justify-start drop-shadow-md animate-slideUp" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
                    {movieOfTheDay.year && <span>{movieOfTheDay.year}</span>}
                    {movieOfTheDay.tmdbRating && <span className="flex items-center gap-1 text-amber-400"><Star className="h-3 w-3 fill-current" /> {Number(movieOfTheDay.tmdbRating).toFixed(1)}</span>}
                    {movieOfTheDay.genre && movieOfTheDay.genre.length > 0 && <><span className="w-1 h-1 rounded-full bg-white/30" /><span>{Array.isArray(movieOfTheDay.genre) ? movieOfTheDay.genre.slice(0, 2).join(', ') : movieOfTheDay.genre}</span></>}
                  </div>
                </div>
              )}

              {movies.length === 0 && (
                <div className="mb-12 text-center w-full animate-slideUp" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                  <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight text-balance max-w-2xl mx-auto drop-shadow-xl">
                    Your movies, <br className="hidden sm:block" /><span className="text-white/60">one link</span> away
                  </h1>
                </div>
              )}

              {/* URL Input */}
              <div className="w-full max-w-2xl mt-4 animate-slideUp" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
                <form onSubmit={(e) => { e.stopPropagation(); handleHeroSubmit(e); }} onClick={e => e.stopPropagation()}
                  className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 focus-within:bg-black/60 transition-all duration-300 shadow-2xl mx-auto cursor-text">
                  <Link2 className="h-5 w-5 text-white/50 ml-5 shrink-0" />
                  <input type="text" value={heroUrl} onChange={e => { setHeroUrl(e.target.value); setHeroError(''); }}
                    placeholder="Paste an Instagram Reel link..." className="flex-1 bg-transparent h-16 px-4 text-base text-white placeholder-white/40 focus:outline-none" />
                  <button type="submit" className="shrink-0 h-11 px-4 sm:px-8 mr-2.5 my-2.5 bg-white hover:bg-neutral-200 hover:scale-105 text-black font-bold text-sm rounded-xl transition-all duration-300 active:scale-95 shadow-lg">Import</button>
                </form>
                {heroError && <p className={`flex items-center gap-1.5 text-red-400 text-sm mt-3 font-medium ${movies.length > 0 ? 'ml-2' : 'justify-center'}`}><AlertCircle className="h-4 w-4" />{heroError}</p>}
                <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-6 ${movies.length > 0 ? 'sm:justify-start pl-2' : ''}`}>
                  <button type="button" onClick={handlePasteFromClipboard} className="group flex items-center justify-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-sm font-semibold text-white/80 transition-all active:scale-95">
                    <Clipboard className="h-4 w-4 text-white/50 group-hover:text-white transition-colors" /> Paste from Clipboard
                  </button>
                  <button type="button" onClick={() => setIsIosSetupOpen(true)} className="group flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-sm font-semibold text-blue-400 transition-all active:scale-95">
                    <Sparkles className="h-4 w-4 group-hover:text-blue-300 transition-colors" /> Enable iOS Share
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Quick Stats Bar ── */}
          {movies.length > 0 && (
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
              <div className="flex items-center justify-center gap-6 text-sm text-white/40 font-medium animate-fadeIn">
                <span className="flex items-center gap-1.5"><Film className="h-3.5 w-3.5" /> {totalCount} saved</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> {watchedThisMonth} watched this month</span>
                <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                <Link href="/watchlist" className="hidden sm:flex items-center gap-1 text-amber-500 hover:text-amber-400 transition-colors font-semibold">
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          )}

          {/* ── Mood Discovery ── */}
          {movies.length > 0 && (
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-white tracking-tight">What&apos;s your mood?</h2>
                {activeMood && (
                  <button onClick={() => setActiveMood(null)} className="text-xs text-white/40 hover:text-white transition-colors font-medium">Clear</button>
                )}
              </div>

              {/* Mood Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {MOODS.map((mood, i) => {
                  const count = moodCounts.get(mood.id) || 0;
                  const isActive = activeMood === mood.id;
                  return (
                    <button
                      key={mood.id}
                      onClick={() => setActiveMood(isActive ? null : mood.id)}
                      className={`relative group px-4 py-4 rounded-2xl border backdrop-blur-sm transition-all duration-300 active:scale-[0.97] animate-slideUp ${mood.glow} ${
                        isActive
                          ? `bg-gradient-to-br ${mood.gradient} ${mood.border} shadow-lg`
                          : `bg-white/[0.02] border-white/[0.06] hover:bg-gradient-to-br hover:${mood.gradient} hover:${mood.border}`
                      }`}
                      style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{mood.emoji}</span>
                        <div className="text-left flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'} transition-colors`}>
                            {mood.id}
                          </p>
                          {count > 0 && (
                            <p className="text-[10px] text-white/30 font-medium">{count} movie{count !== 1 ? 's' : ''}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mood Results */}
              {activeMood && (
                <ErrorBoundary>
                  <div className="animate-fadeIn">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white/60">
                        <span className="text-white">{moodMovies.length}</span> movie{moodMovies.length !== 1 ? 's' : ''} for <span className="text-amber-500">{activeMood}</span>
                      </h3>
                    </div>

                    {moodMovies.length > 0 ? (
                      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory no-scrollbar">
                        {moodMovies.map(movie => (
                          <button
                            key={movie.id}
                            onClick={() => setSelectedMovie(movie)}
                            className="flex-shrink-0 w-[140px] sm:w-[160px] group snap-start"
                          >
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-white/5 border border-white/[0.06] group-hover:border-white/20 transition-all group-hover:-translate-y-1 group-hover:shadow-xl">
                              {movie.posterUrl ? (
                                <Image src={movie.posterUrl} alt={movie.title} fill sizes="(max-width: 640px) 140px, 160px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Film className="h-8 w-8 text-white/20" /></div>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors truncate">{movie.title}</p>
                            {movie.year && <p className="text-[10px] text-white/30">{movie.year}</p>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/30 text-sm text-center py-8">No movies match this mood yet. Import more reels!</p>
                    )}
                  </div>
                </ErrorBoundary>
              )}
            </section>
          )}
        </main>

        {/* Modals */}
        <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} initialUrl={heroUrl} onImport={handleImport} />
        <BugReportModal isOpen={isBugReportOpen} onClose={() => setIsBugReportOpen(false)} />
        <DetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} onDelete={async () => {}} onToggleWatched={async () => {}} />
        <IosSetupModal isOpen={isIosSetupOpen} onClose={() => setIsIosSetupOpen(false)} />
        <BottomNav onImportClick={() => setIsImportOpen(true)} />
      </div>
    </>
  );
}
