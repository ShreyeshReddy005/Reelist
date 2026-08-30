'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addMovieToFirestore } from '@/lib/firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, LogIn } from 'lucide-react';
import { Movie } from '@/types/movie';

interface Props {
  movie: Movie;
  shareId: string;
}

export default function AddFromShareButton({ movie, shareId }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!user) {
      router.push(`/login?redirect=/share/${shareId}`);
      return;
    }

    setLoading(true);
    try {
      // Modify movie object to assign to the new user and queue it to their watchlist
      const newMovie: Movie = {
        ...movie,
        addedAt: new Date().toISOString(),
        queue: 'watchlist',
        watched: false
      };
      
      await addMovieToFirestore(user.uid, newMovie);
      // Redirect to watchlist
      router.push('/watchlist');
    } catch (e) {
      console.error(e);
      alert('Failed to add movie to watchlist');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <button 
        onClick={handleAdd}
        className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-full flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 border border-white/20"
      >
        <LogIn className="w-5 h-5" />
        Log in to Save
      </button>
    );
  }

  return (
    <button 
      onClick={handleAdd}
      disabled={loading}
      className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-bold rounded-full flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,0,128,0.4)] disabled:opacity-50 disabled:scale-100"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Plus className="w-5 h-5" />
      )}
      {loading ? 'Adding...' : 'Add to My Watchlist'}
    </button>
  );
}
