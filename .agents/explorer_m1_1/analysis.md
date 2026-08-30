# Reelist Elite — UI/UX Foundation Investigation & Setup Strategy

This document details the setup strategy, design specifications, and implementation plan for the UI/UX Foundation (Milestone M1) of the **Reelist Elite** project.

---

## 1. System Investigation: Pre-existing Files & Dependencies

We performed a filesystem check in the workspace root (`C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite`) and surrounding environments to discover existing configurations and cache resources.

### A. Workspace Root Audit
The workspace root is currently a clean slate. The only pre-existing files are:
1. `PROJECT.md` — Core architectural specifications, database/auth interfaces, and data models.
2. `plan.md` — High-level milestone execution roadmap.
3. `.agents/` — Coordinates agent metadata (plans, briefings, progress logs).

No codebase files (`package.json`, `tsconfig.json`, `tailwind.config.js`, or the `src/` directory) exist in the root yet.

### B. System Environment & Caching Discoveries
We discovered a nearby active sister project, **Reel to Cinema**, located at `C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\reel-to-cinema\web`. 
This project has a populated `node_modules` folder, indicating that the packages and versions it uses are **already cached locally** on the system. Because our workspace is in a **code-only network mode (no external web access)**, using these pre-cached versions is the safest and most reliable way to perform offline installation.

The cached versions from the sister project are:
- **Next.js**: `16.2.9` (App Router)
- **React / React-DOM**: `19.2.4`
- **Tailwind CSS**: `^4.0.0` (v4 with PostCSS plugin)
- **PostCSS Tooling**: `@tailwindcss/postcss ^4.0.0`
- **TypeScript**: `^5.0.0`
- **UI Icons**: `lucide-react ^1.21.0`
- **Animation**: `framer-motion ^12.42.0`

---

## 2. Next.js, Tailwind CSS, & TypeScript Initialization Strategy

Due to the lack of external network access and the need to initialize within a non-empty directory containing `.agents/` and documentation, **interactive generation using `create-next-app` is discouraged** as it may conflict with existing files or hang waiting for user inputs.

Instead, we recommend a **Declarative Initialization Strategy**:
1. Directly write the configuration files (`package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`) to the workspace root.
2. Run a non-interactive, offline-optimized install command:
   ```bash
   npm install --prefer-offline --no-audit --no-fund
   ```

Below are the exact declarative configuration blueprints.

### blueprint 1: `package.json`
Specifies package versions compatible with the local package cache to prevent internet-dependent downloads:
```json
{
  "name": "reelist-elite",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "lucide-react": "^1.21.0",
    "framer-motion": "^12.42.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "16.2.9",
    "postcss": "^8.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### blueprint 2: `tsconfig.json`
Ensures TypeScript matches Next.js App Router parameters and handles `@/*` module paths:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

### blueprint 3: `postcss.config.mjs`
Configures Tailwind CSS v4's PostCSS pipeline:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### blueprint 4: `next.config.ts`
Enables strict React mode and configures TMDB/Amazon image hosts so posters render correctly:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
    ],
  },
};

export default nextConfig;
```

---

## 3. The 80/20 Visual Design System Setup

The **80/20 design philosophy** focuses attention on media assets and interactive content, utilizing a dark, cinematic visual palette. 

### Tailwind CSS Version 4 vs. Version 3 Configuration
Since the cached system environment uses **Tailwind v4**, configuration is done in the main CSS file via `@theme` directives instead of `tailwind.config.js`. Below, we present **both** setups so the implementer can utilize whichever Tailwind version is ultimately installed.

### Option A: Tailwind v4 Theme Configuration (Recommended)
Add the theme overrides directly at the top of `src/app/globals.css`:
```css
@import "tailwindcss";

@theme inline {
  /* 80% Dark/Neutral Background Canvas Colors */
  --color-cinema-black: #06060a;
  --color-cinema-card: #0f0f16;
  --color-cinema-border: #1f1f2e;
  --color-cinema-gray: #71717a;
  
  /* 20% Vibrant Brand Accents */
  --color-brand-primary: #e11d48; /* Rose-600 */
  --color-brand-hover: #be123c;   /* Rose-700 */
  --color-brand-accent: #f59e0b;  /* Amber-500 */
  
  /* Layout utilities */
  --shadow-glow: 0 0 15px 2px rgba(225, 29, 72, 0.15);
}

:root {
  --background: #06060a;
  --foreground: #f4f4f5;
}

body {
  background: var(--background);
  color: var(--foreground);
  overflow-x: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
```

### Option B: Tailwind v3 Theme Configuration (`tailwind.config.js`)
If the installation falls back to Tailwind v3, place this in the workspace root:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          black: '#06060a',
          card: '#0f0f16',
          border: '#1f1f2e',
          gray: '#71717a',
        },
        brand: {
          primary: '#e11d48',
          hover: '#be123c',
          accent: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 15px 2px rgba(225, 29, 72, 0.15)',
      }
    },
  },
  plugins: [],
};
```

---

## 4. Main Dashboard Layout & Mock Components

We outline the design spec and mock structures for the core components under `src/components/` and `src/app/`.

### 1. Root Layout (`src/app/layout.tsx`)
Initializes the HTML skeleton, imports styles, and ensures smooth viewport scaling.
```tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reelist Elite',
  description: 'Premium Watchlist Dashboard & Instagram Reel Parser',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="h-full bg-cinema-black text-zinc-100 antialiased selection:bg-brand-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
```

### 2. Header Component (`src/components/Header.tsx`)
A sticky header displaying branding, search/filter sync progress, active session simulation, and a CTA button to trigger the Import Modal.
```tsx
import React from 'react';
import { Film, Plus, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onOpenImport: () => void;
  pendingCount: number;
  isProcessing: boolean;
  onEnrich: () => void;
}

export default function Header({ onOpenImport, pendingCount, isProcessing, onEnrich }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-cinema-black/80 backdrop-blur-md border-b border-cinema-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white leading-none">REELIST <span className="text-brand-accent">ELITE</span></h1>
            <span className="text-[9px] font-bold text-cinema-gray tracking-widest uppercase">Instagram Curator</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {pendingCount > 0 && (
            <button
              onClick={onEnrich}
              disabled={isProcessing}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand-accent ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{pendingCount} Pending Reels</span>
            </button>
          )}

          {/* Simulated Session */}
          <div className="hidden md:block text-xs font-medium text-cinema-gray bg-cinema-card border border-cinema-border px-3.5 py-2 rounded-lg">
            demo@reelist.elite
          </div>

          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition shadow-md shadow-brand-primary/10"
          >
            <Plus className="w-4 h-4" />
            <span>Import Reel</span>
          </button>
        </div>
      </div>
    </header>
  );
}
```

### 3. Search & Filter Bar (`src/components/SearchFilters.tsx`)
Enables fluid search by title, sorting by rating/date, and filtering by parsing status.
```tsx
import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  sortBy: 'addedAt' | 'rating';
  setSortBy: (val: 'addedAt' | 'rating') => void;
  filterStatus: 'all' | 'processed' | 'pending' | 'failed';
  setFilterStatus: (val: 'all' | 'processed' | 'pending' | 'failed') => void;
}

export default function SearchFilters({
  search,
  setSearch,
  sortBy,
  setSortBy,
  filterStatus,
  setFilterStatus,
}: SearchFiltersProps) {
  return (
    <div className="w-full flex flex-col md:flex-row gap-4 bg-cinema-card/50 border border-cinema-border p-4 rounded-xl">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-cinema-gray" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search movies in watchlist..."
          className="w-full bg-cinema-black border border-cinema-border focus:border-brand-primary focus:outline-none rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 transition"
        />
      </div>

      {/* Select Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-2 bg-cinema-black border border-cinema-border rounded-lg px-3 py-2 text-xs">
          <span className="text-cinema-gray">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-transparent text-zinc-200 outline-none cursor-pointer font-medium"
          >
            <option value="all" className="bg-cinema-card">All items</option>
            <option value="processed" className="bg-cinema-card">Processed</option>
            <option value="pending" className="bg-cinema-card">Pending</option>
            <option value="failed" className="bg-cinema-card">Failed</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div className="flex items-center gap-2 bg-cinema-black border border-cinema-border rounded-lg px-3 py-2 text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-cinema-gray" />
          <span className="text-cinema-gray">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-zinc-200 outline-none cursor-pointer font-medium"
          >
            <option value="addedAt" className="bg-cinema-card">Date Added</option>
            <option value="rating" className="bg-cinema-card">TMDB Rating</option>
          </select>
        </div>
      </div>
    </div>
  );
}
```

### 4. Movie Card Component (`src/components/MovieCard.tsx`)
Renders the movie item. Shows fallback poster UI, rating badge, and standard hover interaction overlays.
```tsx
import React from 'react';
import { Star, ExternalLink, Trash2, Play } from 'lucide-react';
import { Movie } from '@/lib/db'; // References the interface type

interface MovieCardProps {
  movie: Movie;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onSelect: () => void;
}

export default function MovieCard({ movie, onDelete, onSelect }: MovieCardProps) {
  return (
    <div 
      onClick={onSelect}
      className="group relative bg-cinema-card border border-cinema-border hover:border-brand-primary/40 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-xl flex flex-col"
    >
      {/* Media Window */}
      <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden flex items-center justify-center text-cinema-gray">
        {movie.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="object-cover w-full h-full group-hover:scale-105 group-hover:brightness-50 transition duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{movie.title}</span>
            <span className="text-[10px] text-zinc-600">Poster Missing</span>
          </div>
        )}

        {/* Rating Overlay badge */}
        {movie.rating && (
          <div className="absolute top-3 right-3 bg-cinema-black/85 border border-brand-accent/20 backdrop-blur px-2.5 py-1 rounded-md flex items-center gap-1 text-[11px] font-bold text-brand-accent">
            <Star className="h-3 w-3 fill-current" />
            <span>{movie.rating}</span>
          </div>
        )}

        {/* Actions Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button 
            className="w-10 h-10 rounded-full bg-white text-cinema-black hover:bg-zinc-200 transition flex items-center justify-center shadow-lg"
            title="Open Details"
          >
            <Play className="w-4 h-4 fill-cinema-black translate-x-0.5" />
          </button>
          
          {movie.sourceUrl && (
            <a
              href={movie.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-10 h-10 rounded-full bg-cinema-black/80 hover:bg-cinema-black border border-cinema-border text-zinc-300 hover:text-white transition flex items-center justify-center"
              title="Watch Reel"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <button
            onClick={(e) => onDelete(movie.id, e)}
            className="w-10 h-10 rounded-full bg-rose-950/80 hover:bg-rose-900 border border-rose-900/40 text-rose-400 hover:text-rose-300 transition flex items-center justify-center"
            title="Delete Watchlist"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Info Panel */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-1">
        <h3 className="font-bold text-zinc-200 group-hover:text-brand-primary transition-colors line-clamp-1 text-sm md:text-base">
          {movie.title}
        </h3>
        <p className="text-[10px] text-cinema-gray">
          Added {new Date(movie.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
```

### 5. Add Movie Modal Component (`src/components/ImportModal.tsx`)
A premium modal ensuring full URL checks (validates Instagram Reel pathing) and manages enrichment loading states.
```tsx
import React, { useState } from 'react';
import { X, Link, Sparkles, AlertTriangle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string) => Promise<void>;
}

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please paste a valid Reel URL.');
      return;
    }

    // Strict local parsing checks to keep pipeline data clean
    if (!url.includes('instagram.com/reel/') && !url.includes('instagram.com/p/')) {
      setError('Invalid format. URL must contain instagram.com/reel/ or instagram.com/p/');
      return;
    }

    setLoading(true);
    try {
      await onImport(url);
      setUrl('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Scraper failed to extract movie details fromcaption.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop blur */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog Frame */}
      <div className="relative w-full max-w-md bg-cinema-card border border-cinema-border p-6 rounded-2xl shadow-2xl z-10">
        <button onClick={onClose} className="absolute right-4 top-4 text-cinema-gray hover:text-zinc-300 transition">
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-brand-primary" />
          <span>Curate Movie via Instagram Reel</span>
        </h2>
        <p className="text-xs text-cinema-gray mb-6">
          Paste the URL below. Our background NLP pipeline will extract the movie name and download HD TMDB metadata.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Reel URL</label>
            <div className="relative">
              <Link className="absolute left-3 top-3 h-4 w-4 text-cinema-gray" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/C..."
                className="w-full bg-cinema-black border border-cinema-border focus:border-brand-primary focus:outline-none rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-700 transition"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-brand-primary/10"
            >
              {loading ? 'Curating AI...' : 'Import Movie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 6. Movie Detail Modal Component (`src/components/MovieDetailModal.tsx`)
A cinematic movie layout that plays a mock trailer/backdrop preview, reviews metadata/genres, and shows the raw caption extracted from Instagram.
```tsx
import React, { useState } from 'react';
import { X, ExternalLink, Trash2, Star } from 'lucide-react';
import { Movie } from '@/lib/db';

interface MovieDetailModalProps {
  movie: Movie | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function MovieDetailModal({ movie, onClose, onDelete }: MovieDetailModalProps) {
  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      {/* Premium Detail Box */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-cinema-card border border-cinema-border shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[80vh] z-10">
        
        {/* Left Side: Mock Video Stream or HD Backdrop */}
        <div className="w-full md:w-[60%] aspect-video md:aspect-auto md:h-full bg-zinc-950 relative">
          {movie.posterUrl ? (
            <img 
              src={movie.posterUrl} 
              alt={movie.title}
              className="w-full h-full object-cover filter brightness-75 select-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cinema-gray">
              <span>No cinematic preview</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-card via-transparent to-transparent md:hidden" />
        </div>

        {/* Right Side: Content Metadata */}
        <div className="w-full md:w-[40%] p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-full">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-cinema-gray hover:text-white transition z-20 border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-5">
            {/* Badges */}
            <div className="flex items-center flex-wrap gap-2">
              {movie.rating && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-primary text-white flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <span>★ {movie.rating}</span>
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                Curated
              </span>
            </div>

            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                {movie.title}
              </h3>
              <p className="text-[10px] text-cinema-gray mt-1">
                Imported on {new Date(movie.addedAt).toLocaleDateString()}
              </p>
            </div>

            {/* Description placeholder */}
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-brand-accent uppercase tracking-wider">TMDB Synopsis</h5>
              <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                Discover the cinematic story of {movie.title}. Rich metadata, genres, cast lists, and streaming options will be synced once the intelligence pipeline is integrated in Milestone M3.
              </p>
            </div>

            {/* IG Capture Text */}
            {movie.sourceUrl && (
              <div className="space-y-1 bg-white/5 p-3 rounded-lg border border-white/5">
                <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Source Reel Metadata</h5>
                <p className="text-[11px] text-cinema-gray leading-normal italic line-clamp-3">
                  Parsed from Instagram Reel: {movie.sourceUrl}
                </p>
              </div>
            )}
          </div>

          {/* Footer Action Links */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/10">
            {movie.sourceUrl && (
              <a
                href={movie.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition shadow-lg shadow-brand-primary/10"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Watch Reel</span>
              </a>
            )}

            <button
              onClick={() => {
                onDelete(movie.id);
                onClose();
              }}
              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-rose-950 text-cinema-gray hover:text-rose-400 transition"
              title="Delete watchlist item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
```

### 7. Main Dashboard Page (`src/app/page.tsx`)
Coordinates search state, filter rules, active modals, and displays the static mock movies watchlist.
```tsx
"use client";

import React, { useState } from 'react';
import Header from '@/components/Header';
import SearchFilters from '@/components/SearchFilters';
import MovieCard from '@/components/MovieCard';
import ImportModal from '@/components/ImportModal';
import MovieDetailModal from '@/components/MovieDetailModal';

// Static Interface conforming to PROJECT.md
export interface Movie {
  id: string;
  title: string;
  posterUrl?: string;
  rating?: string;
  sourceUrl?: string;
  addedAt: string;
  status: 'processed' | 'pending' | 'failed';
}

const MOCK_WATCHLIST: Movie[] = [
  {
    id: '1',
    title: 'Inception',
    posterUrl: 'https://image.tmdb.org/t/p/w500/o01e0u1j1Q8jJy4liEXR67Rz55U.jpg',
    rating: '8.8',
    sourceUrl: 'https://www.instagram.com/reel/C8aBcDeFgHi/',
    addedAt: '2026-06-25T12:00:00Z',
    status: 'processed',
  },
  {
    id: '2',
    title: 'The Dark Knight',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tWGB2XclmAEcZbI6SnLI0w6n.jpg',
    rating: '9.0',
    sourceUrl: 'https://www.instagram.com/reel/C8jKlMnOpQr/',
    addedAt: '2026-06-26T09:30:00Z',
    status: 'processed',
  },
  {
    id: '3',
    title: 'Interstellar',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QvEOmfcOAJjBhGTL5NfJhsb.jpg',
    rating: '8.7',
    sourceUrl: 'https://www.instagram.com/reel/C8zYxWvUtSr/',
    addedAt: '2026-06-27T02:15:00Z',
    status: 'processed',
  },
  {
    id: '4',
    title: 'Gladiator II (Pending Reel)',
    rating: '7.8',
    sourceUrl: 'https://www.instagram.com/reel/C9aBcDeFgHi/',
    addedAt: '2026-06-27T05:00:00Z',
    status: 'pending',
  }
];

export default function Home() {
  const [watchlist, setWatchlist] = useState<Movie[]>(MOCK_WATCHLIST);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'addedAt' | 'rating'>('addedAt');
  const [filterStatus, setFilterStatus] = useState<'all' | 'processed' | 'pending' | 'failed'>('all');
  
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handlers
  const handleImport = async (url: string) => {
    // Simulate pipeline processing additions
    const newMovie: Movie = {
      id: Date.now().toString(),
      title: 'Auto-Extracted Movie from Reel',
      sourceUrl: url,
      addedAt: new Date().toISOString(),
      status: 'pending',
    };
    setWatchlist(prev => [newMovie, ...prev]);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWatchlist(prev => prev.filter(m => m.id !== id));
  };

  const handleEnrich = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setWatchlist(prev => prev.map(m => {
        if (m.status === 'pending') {
          return {
            ...m,
            title: m.title === 'Auto-Extracted Movie from Reel' ? 'Dune: Part Two' : m.title,
            posterUrl: 'https://image.tmdb.org/t/p/w500/czemb421NaZFfgPlACjJ2q62jZt.jpg',
            rating: '8.3',
            status: 'processed'
          };
        }
        return m;
      }));
      setIsProcessing(false);
    }, 1500);
  };

  // Filter & Sort Logic
  const filteredList = watchlist
    .filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        const rA = parseFloat(a.rating || '0');
        const rB = parseFloat(b.rating || '0');
        return rB - rA;
      } else {
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
    });

  const pendingCount = watchlist.filter(m => m.status === 'pending').length;

  return (
    <div className="relative min-h-screen pb-24 text-zinc-100 font-sans">
      <Header 
        onOpenImport={() => setIsImportOpen(true)} 
        pendingCount={pendingCount} 
        isProcessing={isProcessing}
        onEnrich={handleEnrich}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
        {/* Search and filter controls */}
        <SearchFilters
          search={search}
          setSearch={setSearch}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />

        {/* Watchlist Viewport Grid */}
        {filteredList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredList.map(movie => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onDelete={(id, e) => handleDelete(id, e)}
                onSelect={() => setSelectedMovie(movie)}
              />
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-cinema-border rounded-2xl bg-cinema-card/20 p-8 text-center text-cinema-gray">
            <p className="text-sm font-semibold">No watchlist matches found.</p>
            <p className="text-xs mt-1">Try adjusting search parameters or import a new Instagram Reel.</p>
          </div>
        )}
      </main>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />

      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

---

## 5. Responsiveness Plan

The design layout relies heavily on CSS Grid and Flexbox with mobile-first Tailwind media queries:

| Viewport Category | Width Range | Layout Configurations |
|---|---|---|
| **Mobile** | `< 640px` | <ul><li>Grid defaults to single column (`grid-cols-1`).</li><li>Header wrapping for sync counters.</li><li>Filter and sort inputs stack vertically to preserve touch target spacing.</li><li>Modals utilize viewport filling (`w-full h-full max-h-[100vh]`) with card drawers.</li></ul> |
| **Tablet** | `640px - 1024px` | <ul><li>2 or 3 columns (`sm:grid-cols-2 md:grid-cols-3`).</li><li>Filters layout floats side-by-side.</li><li>Mock session metadata badge appears in Header.</li></ul> |
| **Desktop & Wide** | `> 1024px` | <ul><li>4 or 5 columns (`lg:grid-cols-4 xl:grid-cols-5`) to maximize poster density.</li><li>Main frame constrained by `max-w-7xl mx-auto`.</li><li>Movie Detail Modal shows side-by-side split screen (HD backdrop vs. synopsis metadata).</li></ul> |

---

## 6. Offline Implementation Verification Method

To verify the setup safely in our code-only, offline environment:
1. Ensure all configuration blueprints are written.
2. Run `npm install --prefer-offline` in the root.
3. Validate that package resolution correctly picks up cached files from the system without attempts to query npm registry mirrors.
4. Execute `npm run build` to confirm Next.js project compiles, parses all JSX tags, and passes all ESLint rules cleanly.
