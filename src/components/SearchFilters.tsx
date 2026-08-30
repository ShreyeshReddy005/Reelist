'use client';

import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type { SortOption, StatusFilter } from '@/types/movie';

interface SearchFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  sortBy: SortOption;
  setSortBy: (val: SortOption) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (val: StatusFilter) => void;
  genres: string[];
  selectedGenre: string;
  setSelectedGenre: (val: string) => void;
  providers: { name: string; logoUrl: string }[];
  selectedProvider: string;
  setSelectedProvider: (val: string) => void;
  totalCount: number;
  unwatchedCount: number;
  watchedCount: number;
}

function CustomDropdown({
  value,
  onChange,
  options,
  label,
  allowClear = false,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  label: string;
  allowClear?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5
          text-sm font-medium tracking-wide
          transition-all duration-300
          focus:outline-none
          hover:text-white/90
          ${isOpen || value ? 'text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'text-neutral-500'}
        `}
      >
        {selectedOption ? selectedOption.label : label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'text-neutral-500'}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-48 max-h-72 overflow-y-auto hide-scrollbar bg-black/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {allowClear && (
            <button
              onClick={() => { onChange(''); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${!value ? 'text-white font-medium bg-white/5' : 'text-neutral-400'}`}
            >
              {label}
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${value === opt.value ? 'text-white font-medium bg-white/5' : 'text-neutral-400'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchFilters({
  search,
  setSearch,
  sortBy,
  setSortBy,
  statusFilter,
  setStatusFilter,
  genres,
  selectedGenre,
  setSelectedGenre,
  providers,
  selectedProvider,
  setSelectedProvider,
  totalCount,
  unwatchedCount,
  watchedCount,
}: SearchFiltersProps) {
  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'unwatched', label: 'To Watch', count: unwatchedCount },
    { key: 'watched', label: 'Watched', count: watchedCount },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'topRated', label: 'Top Rated' },
    { value: 'recentRelease', label: 'Recent Release' },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      {/* Search Bar */}
      <div className="relative w-full md:w-64 lg:w-80 shrink-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="
            w-full h-10
            bg-white/[0.04] border border-white/[0.08]
            focus:border-white/20 focus:bg-white/[0.06]
            focus:outline-none focus:ring-1 focus:ring-white/10
            rounded-xl pl-10 pr-4
            text-sm text-neutral-200 placeholder-neutral-500
            transition-all duration-200 shadow-sm
          "
        />
      </div>

      {/* Filters Row - Netflix Style */}
      <div className="flex items-center flex-wrap gap-y-4 gap-x-6 pb-2 md:pb-0 pt-2 flex-1 justify-start md:justify-end">
        {/* Status filter tabs */}
        <div className="flex gap-6 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`
                flex items-center gap-1.5 text-sm tracking-wide
                transition-all duration-300
                ${
                  statusFilter === tab.key
                    ? 'text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] scale-105'
                    : 'text-neutral-500 font-medium hover:text-white/90 hover:scale-105'
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`tabular-nums text-xs ${statusFilter === tab.key ? 'text-white/70' : 'text-neutral-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-white/10 shrink-0" />

        {/* Sort dropdown */}
        <CustomDropdown
          value={sortBy}
          onChange={(val) => setSortBy(val as SortOption)}
          options={sortOptions}
          label="Sort By"
        />

        {/* Genre Dropdown */}
        {genres.length > 0 && (
          <CustomDropdown
            value={selectedGenre}
            onChange={setSelectedGenre}
            options={genres.map(g => ({ label: g, value: g }))}
            label="Genres"
            allowClear
          />
        )}

        {/* Streaming Provider Dropdown */}
        {providers.length > 0 && (
          <CustomDropdown
            value={selectedProvider}
            onChange={setSelectedProvider}
            options={providers.map(p => ({ label: p.name, value: p.name }))}
            label="Platforms"
            allowClear
          />
        )}
      </div>
    </div>
  );
}
