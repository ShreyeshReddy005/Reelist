'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import { Search, Film, Loader2, Sparkles, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import SearchFilters from '@/components/SearchFilters';
import MovieCard from '@/components/MovieCard';
import BottomNav from '@/components/BottomNav';
import PushPermissionButton from '@/components/PushPermissionButton';
import dynamic from 'next/dynamic';

const ImportModal = dynamic(() => import('@/components/ImportModal'), { ssr: false });
const DetailModal = dynamic(() => import('@/components/DetailModal'), { ssr: false });
const BugReportModal = dynamic(() => import('@/components/BugReportModal'), { ssr: false });
const OracleModal = dynamic(() => import('@/components/OracleModal'), { ssr: false });
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/components/Toast';
import type { Movie, SortOption, StatusFilter } from '@/types/movie';
import { useWatchlist } from '@/hooks/useWatchlist';
import { fuzzyMatch } from '@/lib/fuzzySearch';

export default function WatchlistPage() {
  const { movies, mounted, addMovies, updateMovie, removeMovie } = useWatchlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isOracleOpen, setIsOracleOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [heroUrl, setHeroUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'watchlist' | 'review'>('watchlist');
  const [selectedProvider, setSelectedProvider] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const { showToast } = useToast();

  const totalCount = movies.filter(m => m.queue !== 'review').length;
  const reviewCount = movies.filter(m => m.queue === 'review').length;
  const watchedCount = movies.filter(m => m.queue !== 'review' && m.watched).length;
  const unwatchedCount = totalCount - watchedCount;

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach(m => { if (m.queue !== 'review' && Array.isArray(m.genre)) m.genre.forEach(g => set.add(g)); });
    return Array.from(set).sort();
  }, [movies]);

  const allProviders = useMemo(() => {
    const map = new Map<string, { name: string; logoUrl: string }>();
    movies.forEach(m => { if (m.queue !== 'review') m.watchProviders?.forEach(p => map.set(p.name, p)); });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [movies]);

  const allHashtags = useMemo(() => {
    const counts = new Map<string, number>();
    movies.forEach(m => { if (m.queue !== 'review' && m.hashtags) m.hashtags.forEach(h => counts.set(h, (counts.get(h) || 0) + 1)); });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 10);
  }, [movies]);

  const filteredMovies = useMemo(() => {
    let result = [...movies];
    result = activeTab === 'review' ? result.filter(m => m.queue === 'review') : result.filter(m => m.queue !== 'review');
    if (statusFilter === 'watched') result = result.filter(m => m.watched);
    else if (statusFilter === 'unwatched') result = result.filter(m => !m.watched);
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery;
      result = result.filter(m => 
        fuzzyMatch(q, m.title) || 
        (m.director && fuzzyMatch(q, m.director)) || 
        (m.hashtags?.some(h => fuzzyMatch(q, h))) || 
        (Array.isArray(m.genre) && m.genre.some(g => fuzzyMatch(q, g)))
      );
    }
    if (selectedGenre) result = result.filter(m => m.genre?.includes(selectedGenre));
    if (selectedProvider) result = result.filter(m => m.watchProviders?.some(p => p.name === selectedProvider));
    switch (sortBy) {
      case 'oldest': result.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()); break;
      case 'topRated': result.sort((a, b) => (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0)); break;
      case 'recentRelease': result.sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0')); break;
      default: result.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    }
    return result;
  }, [movies, activeTab, statusFilter, deferredSearchQuery, selectedGenre, selectedProvider, sortBy]);



  const handleImport = async (newMovies: Movie[]) => { await addMovies(newMovies); showToast(`Added ${newMovies.length} movie${newMovies.length !== 1 ? 's' : ''}!`, 'success'); };
  const handleDelete = async (id: string) => { await removeMovie(id); setSelectedMovie(null); showToast('Removed', 'info'); };
  const handleToggleWatched = async (id: string, watched: boolean) => { await updateMovie(id, { watched }); showToast(watched ? 'Marked watched ✓' : 'Unmarked', 'success'); };
  const handleApprove = async (m: Movie) => { await updateMovie(m.id, { queue: 'watchlist' }); showToast(`"${m.title}" added!`, 'success'); };
  const handleReject = async (m: Movie) => { await removeMovie(m.id); showToast(`"${m.title}" removed`, 'info'); };
  if (!mounted) return <div className="min-h-screen bg-background flex flex-col items-center justify-center"><Loader2 className="h-8 w-8 text-amber-500 animate-spin mb-4" /><span className="text-sm text-slate-500">Loading...</span></div>;
  return (
    <>
      <div className="min-h-screen bg-background flex flex-col pb-20 lg:pb-0">
        <Header onOpenBugReport={() => setIsBugReportOpen(true)} />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <section className="pt-8 pb-4">
            <div className="flex items-center gap-3 mb-2"><Film className="h-5 w-5 text-amber-500" /><h1 className="text-2xl font-black text-white tracking-tight">Your Watchlist</h1></div>
            <p className="text-white/40 text-sm">{totalCount} saved · {watchedCount} watched · {unwatchedCount} to watch</p>
          </section>

          <section className="pb-4">
            <SearchFilters search={searchQuery} setSearch={setSearchQuery} sortBy={sortBy} setSortBy={setSortBy} statusFilter={statusFilter} setStatusFilter={setStatusFilter} genres={allGenres} selectedGenre={selectedGenre} setSelectedGenre={setSelectedGenre} providers={allProviders} selectedProvider={selectedProvider} setSelectedProvider={setSelectedProvider} totalCount={totalCount} unwatchedCount={unwatchedCount} watchedCount={watchedCount} />
          </section>

          <section className="pb-16">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center bg-[#0a0a0a] border border-[#171717] rounded-xl p-1">
                <button onClick={() => setActiveTab('watchlist')} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'watchlist' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Watchlist</button>
                <button onClick={() => setActiveTab('review')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'review' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'}`}>
                  Review Queue {reviewCount > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'review' ? 'bg-black text-white' : 'bg-[#171717] text-white'}`}>{reviewCount}</span>}
                </button>
              </div>
            </div>

            <div className="flex justify-center w-full max-w-md mx-auto mb-6"><PushPermissionButton /></div>

            {activeTab === 'watchlist' && allHashtags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fadeIn">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-wider self-center mr-2">Trending</span>
                {allHashtags.map(tag => (<button key={tag} onClick={() => setSearchQuery(searchQuery === tag ? '' : tag)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${searchQuery === tag ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'}`}>{tag}</button>))}
              </div>
            )}

            {activeTab === 'watchlist' && unwatchedCount > 1 && (
              <div className="flex justify-center mb-8">
                <button
                  onClick={() => setIsOracleOpen(true)}
                  className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-purple-500 text-white font-black text-lg hover:from-primary/90 hover:to-purple-500/90 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,0,128,0.3)] animate-pulseGlow"
                >
                  <Sparkles className="w-5 h-5 fill-white" />
                  Decide For Me
                </button>
              </div>
            )}

            <ErrorBoundary>
              {filteredMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                  {filteredMovies.map(movie => (
                    <MovieCard 
                      key={movie.id} 
                      movie={movie} 
                      onDelete={handleDelete} 
                      onClick={setSelectedMovie} 
                      onToggleWatched={(id) => handleToggleWatched(id, !movie.watched)} 
                      isReviewMode={activeTab === 'review'} 
                      onApprove={(id) => { const m = movies.find(x => x.id === id); if (m) handleApprove(m); }} 
                      onReject={(id) => { const m = movies.find(x => x.id === id); if (m) handleReject(m); }} 
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="h-16 w-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4"><Search className="h-7 w-7 text-slate-700" /></div>
                  <p className="text-slate-400 text-sm font-medium mb-1">No movies found</p>
                  <p className="text-neutral-600 text-xs mb-4">{activeTab === 'review' ? 'No movies waiting for review' : searchQuery || selectedGenre || selectedProvider ? 'Try adjusting your filters' : 'Import your first movie from a Reel'}</p>
                  {(searchQuery || selectedGenre || statusFilter !== 'all' || selectedProvider) && (<button onClick={() => { setSearchQuery(''); setSelectedGenre(''); setStatusFilter('all'); setSelectedProvider(''); }} className="text-neutral-400 hover:text-white text-xs font-medium transition-colors">Clear all filters</button>)}
                </div>
              )}
            </ErrorBoundary>
          </section>
        </main>

        <ImportModal isOpen={isImportOpen} onClose={() => { setIsImportOpen(false); setHeroUrl(''); }} onImport={handleImport} initialUrl={heroUrl} />
        <BugReportModal isOpen={isBugReportOpen} onClose={() => setIsBugReportOpen(false)} />
        <OracleModal isOpen={isOracleOpen} onClose={() => setIsOracleOpen(false)} movies={movies} />
        <DetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} onDelete={handleDelete} onToggleWatched={(id) => { const m = movies.find(x => x.id === id); if (m) handleToggleWatched(id, !m.watched); }} />
        <BottomNav onImportClick={() => setIsImportOpen(true)} />
      </div>
    </>
  );
}
