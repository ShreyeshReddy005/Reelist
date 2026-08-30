import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import type { Movie } from '@/types/movie';

interface CarouselRowProps {
  title: string;
  movies: Movie[];
  onDelete: (id: string) => Promise<void>;
  onClick: (movie: Movie) => void;
  onToggleWatched: (id: string, watched: boolean) => Promise<void>;
}

export default function CarouselRow({ title, movies, onDelete, onClick, onToggleWatched }: CarouselRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (movies.length === 0) return null;

  return (
    <div className="mb-10 group relative">
      <h2 className="text-xl font-bold text-white mb-4 px-4 sm:px-0 tracking-tight">{title}</h2>
      
      {/* Scroll Buttons - Only visible on hover on non-touch devices */}
      <div className="absolute top-[48px] bottom-0 left-0 w-12 z-10 hidden sm:flex items-center justify-start opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => scroll('left')}
          className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-r-xl backdrop-blur-sm transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>
      
      <div className="absolute top-[48px] bottom-0 right-0 w-12 z-10 hidden sm:flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => scroll('right')}
          className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-l-xl backdrop-blur-sm transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 sm:px-0 pb-4 -mx-4 sm:mx-0"
      >
        {movies.map((movie) => (
          <div key={movie.id} className="snap-start flex-none w-[140px] sm:w-[160px] md:w-[180px]">
            <MovieCard 
              movie={movie}
              onDelete={onDelete}
              onClick={onClick}
              onToggleWatched={(id) => onToggleWatched(id, !movie.watched)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
