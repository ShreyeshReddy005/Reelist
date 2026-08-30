'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Movie } from '@/types/movie';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getWatchlistFromFirestore, 
  addMovieToFirestore, 
  updateMovieInFirestore, 
  deleteMovieFromFirestore 
} from '@/lib/firebase/firestore';

export function useWatchlist() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    async function load() {
      if (user) {
        try {
          const cloudMovies = await Promise.race([
            getWatchlistFromFirestore(user.uid),
            new Promise<Movie[]>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
          ]);
          setMovies(cloudMovies);
        } catch (e) {
          console.error("Failed to load watchlist from Firestore, retaining local cache if available:", e);
          setMovies(prev => prev.length > 0 ? prev : []);
        }
      } else {
        setMovies([]);
      }
      setMounted(true);
    }
    
    if (!authLoading) {
      load();
    }
  }, [user, authLoading]);

  const addMovies = useCallback(async (newMovies: Movie[], queueType: 'watchlist' | 'review' = 'review') => {
    if (!user) return;
    
    setMovies(prev => {
      const existingIds = new Set(prev.map(x => x.id));
      const existingTitleYears = new Set(prev.map(x => `${x.title}-${x.year}`));
      const newAdditions: Movie[] = [];

      for (const m of newMovies) {
        if (!existingIds.has(m.id) && !existingTitleYears.has(`${m.title}-${m.year}`)) {
          const newMovie = {
            ...m,
            queue: m.queue || queueType,
            watched: false,
            addedAt: m.addedAt || new Date().toISOString(),
          };
          newAdditions.push(newMovie);
          existingIds.add(m.id);
          existingTitleYears.add(`${m.title}-${m.year}`);
          
          // Fire and forget update to Firestore with rollback on failure
          addMovieToFirestore(user.uid, newMovie).catch((e) => {
            console.error("Failed to add movie, rolling back:", e);
            setMovies(currentMovies => currentMovies.filter(cm => cm.id !== newMovie.id));
          });
        }
      }
      return [...newAdditions, ...prev];
    });
  }, [user]);

  const updateMovie = useCallback((id: string, updates: Partial<Movie>) => {
    if (!user) return;
    
    // Save previous state for rollback
    let previousMovie: Movie | undefined;
    
    setMovies(prev => {
      previousMovie = prev.find(m => m.id === id);
      return prev.map((m) => (m.id === id ? { ...m, ...updates } : m));
    });
    
    // Fire and forget with rollback
    updateMovieInFirestore(user.uid, id, updates).catch((e) => {
      console.error("Failed to update movie, rolling back:", e);
      if (previousMovie) {
        setMovies(currentMovies => currentMovies.map((m) => (m.id === id ? previousMovie! : m)));
      }
    });
  }, [user]);

  const removeMovie = useCallback((id: string) => {
    if (!user) return;
    
    let previousMovie: Movie | undefined;
    
    setMovies(prev => {
      previousMovie = prev.find(m => m.id === id);
      return prev.filter((m) => m.id !== id);
    });
    
    // Fire and forget with rollback
    deleteMovieFromFirestore(user.uid, id).catch((e) => {
      console.error("Failed to remove movie, rolling back:", e);
      if (previousMovie) {
        setMovies(currentMovies => [previousMovie!, ...currentMovies]);
      }
    });
  }, [user]);

  const clearWatchlist = useCallback(() => {
    // Note: To clear fully, we'd need to delete all docs, but for safety we just clear state here.
    setMovies([]);
  }, []);

  const reloadWatchlist = useCallback(async () => {
    if (user) {
      const cloudMovies = await getWatchlistFromFirestore(user.uid);
      setMovies(cloudMovies);
    }
  }, [user]);

  return {
    movies,
    mounted,
    addMovies,
    updateMovie,
    removeMovie,
    clearWatchlist,
    reloadWatchlist
  };
}
