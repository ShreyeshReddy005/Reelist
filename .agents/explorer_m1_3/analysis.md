# Reelist Elite — UI/UX Foundation Setup Analysis

This document details the setup strategy for initializing Next.js, Tailwind CSS, and TypeScript in the workspace root of `reelist_elite` as part of Milestone M1.

---

## 1. Current System Investigation
A full filesystem inspection of the workspace root (`C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite`) was conducted.
- **Pre-existing files discovered**:
  - `PROJECT.md` (project architecture and specifications)
  - `plan.md` (high-level execution roadmap)
  - `.agents/` (agent coordinate metadata directory)
- **Node/Next.js/Tailwind files**:
  - **No** `package.json`, `package-lock.json`, `yarn.lock`, or `node_modules` exist.
  - **No** `tailwind.config.js`, `postcss.config.js`, or `tsconfig.json` exist.
  - **No** source directories (`src/` or `app/` or `components/`) exist in the root.
- **Environment state**: Node.js and NPM commands are expected to be available globally, but direct E2E automation commands timed out during the check. All recommendations assume a standard Node.js (LTS v20+) environment.

---

## 2. Next.js, Tailwind CSS, and TypeScript Setup Strategy

To initialize the project safely in a non-empty directory (without interfering with `.agents/`, `PROJECT.md`, or `plan.md`), two options are available. **Method A (Declarative)** is highly recommended for subagents as it is deterministic and avoids CLI interactive prompts.

### Method A: Declarative Configuration Files (Recommended)
Directly write the required configuration files to the workspace root, and then execute a single non-interactive installation command.

#### 1. `package.json`
Write this file to the root. It includes standard modern dependency versions (Next.js 14, React 18, Tailwind 3.4, Lucide React for UI icons).
```json
{
  "name": "reelist-elite",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.395.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.4",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5"
  }
}
```

#### 2. `tsconfig.json`
Write this standard Next.js TypeScript config file to the root:
```json
{
  "compilerOptions": {
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
    "jsx": "preserve",
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
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 3. `postcss.config.js`
Write this to the root:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

#### 4. `next.config.mjs`
Write this to the root:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Enable support for rendering movie poster images from standard sources safely
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

#### 5. Installation Command
After creating the files, the worker can execute:
```bash
npm install
```

---

### Method B: `create-next-app` Generation & Migration (Fallback)
If generating via CLI, do NOT run directly in the workspace root due to non-empty directory conflicts. Use a temporary subdirectory:
```bash
# 1. Generate standard app in a temporary folder
npx create-next-app@latest tmp-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm

# 2. Move generated config files and src directory to root (Windows Powershell)
Move-Item -Path .\tmp-app\* -Destination . -Force
Move-Item -Path .\tmp-app\.* -Destination . -ErrorAction SilentlyContinue

# 3. Clean up the temporary folder
Remove-Item -Path .\tmp-app -Recurse -Force
```

---

## 3. The 80/20 Visual Design System (`tailwind.config.js`)

The 80/20 design philosophy requires focus on layout utility and clean cinematography aesthetics. We configure a default dark, cinematic canvas with yellow/amber highlights (simulating movie poster gold and cinema lights).

### Proposed `tailwind.config.js`
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
        // Dark cinematic themes
        background: {
          DEFAULT: '#020617', // Slate-950
          card: '#0f172a',      // Slate-900
          input: '#1e293b',     // Slate-800
        },
        brand: {
          gold: {
            light: '#f59e0b',   // Amber-500
            DEFAULT: '#d97706', // Amber-600
            dark: '#b45309',    // Amber-700
          },
          accent: {
            light: '#818cf8',   // Indigo-400
            DEFAULT: '#6366f1', // Indigo-500
            dark: '#4f46e5',    // Indigo-600
          }
        },
        border: {
          DEFAULT: '#1e293b',   // Slate-800
          hover: '#334155',     // Slate-700
        }
      },
      fontFamily: {
        // Premium modern system sans-serif stack
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
      },
      spacing: {
        // Fine-tuned layouts
        'movie-aspect': '1.5', // 2:3 aspect ratio poster
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'glow': '0 0 15px 2px rgba(217, 119, 6, 0.25)', // Gold accent glow
      }
    },
  },
  plugins: [],
};
```

---

## 4. UI Dashboard Layout & Mock Components

We outline the design structures for the layout and key React components to be added in `src/app/` and `src/components/`.

### 1. Stylesheets & Root Layout
- **`src/app/globals.css`**: Include standard Tailwind directives:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  body {
    background-color: #020617;
    color: #f8fafc;
  }
  ```
- **`src/app/layout.tsx`**: Standard HTML wrapper, imports globals, and applies dark theme styling.
  ```tsx
  import './globals.css';
  import type { Metadata } from 'next';

  export const metadata: Metadata = {
    title: 'Reelist Elite — Watchlist Dashboard',
    description: 'Instagram Reels to Movie Watchlist Pipeline',
  };

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="en" className="h-full">
        <body className="h-full bg-background text-slate-100 font-sans antialiased">
          {children}
        </body>
      </html>
    );
  }
  ```

### 2. Main Dashboard Page (`src/app/page.tsx`)
This page handles state for:
- Search filter keyword (e.g. `const [searchQuery, setSearchQuery] = useState('')`).
- Sort option (e.g. `const [sortBy, setSortBy] = useState<'addedAt' | 'rating'>('addedAt')`).
- Watchlist list (uses mock data conforming to `Movie` interface in `PROJECT.md`).
- Modal visibility state (`const [isImportOpen, setIsImportOpen] = useState(false)`).

**Mock Watchlist Data**:
```typescript
const MOCK_MOVIES = [
  {
    id: '1',
    title: 'Inception',
    posterUrl: 'https://image.tmdb.org/t/p/w500/o01e0u1j1Q8jJy4liEXR67Rz55U.jpg', // or mock placeholders
    rating: '8.8',
    sourceUrl: 'https://www.instagram.com/reel/C8aBcDeFgHi/',
    addedAt: '2026-06-25T12:00:00Z',
  },
  {
    id: '2',
    title: 'The Dark Knight',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tWGB2XclmAEcZbI6SnLI0w6n.jpg',
    rating: '9.0',
    sourceUrl: 'https://www.instagram.com/reel/C8jKlMnOpQr/',
    addedAt: '2026-06-26T09:30:00Z',
  },
  {
    id: '3',
    title: 'Interstellar',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QvEOmfcOAJjBhGTL5NfJhsb.jpg',
    rating: '8.7',
    sourceUrl: 'https://www.instagram.com/reel/C8zYxWvUtSr/',
    addedAt: '2026-06-27T02:15:00Z',
  }
];
```

### 3. Header Component (`src/components/Header.tsx`)
- **Branding**: Text logo: `Reelist` in white, `Elite` in gold bold styling.
- **Controls**:
  - Right-aligned mock session state: avatar or "demo@user.com" email tag.
  - "+ Import Reel" button triggering the modal.
- **Draft Mock Interface**:
  ```tsx
  import React from 'react';
  import { Film, Plus } from 'lucide-react';

  interface HeaderProps {
    onOpenImport: () => void;
  }

  export default function Header({ onOpenImport }: HeaderProps) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md px-4 py-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-6 w-6 text-brand-gold-light" />
          <span className="text-xl font-bold tracking-tight">
            Reelist <span className="text-brand-gold-light">Elite</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-background-card border border-border px-3 py-1.5 rounded-full text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            demo@reelist.elite
          </div>
          <button 
            onClick={onOpenImport}
            className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light transition px-4 py-2 rounded-md font-medium text-sm text-slate-950 shadow-glow"
          >
            <Plus className="h-4 w-4" />
            <span>Import Reel</span>
          </button>
        </div>
      </header>
    );
  }
  ```

### 4. Search & Filter Bar (`src/components/SearchFilters.tsx`)
- Full-width container placing input fields and sort options.
- Includes clear input and search icons.
- **Draft Mock Interface**:
  ```tsx
  import React from 'react';
  import { Search, SlidersHorizontal } from 'lucide-react';

  interface SearchFiltersProps {
    search: string;
    setSearch: (val: string) => void;
    sortBy: string;
    setSortBy: (val: any) => void;
  }

  export default function SearchFilters({ search, setSearch, sortBy, setSortBy }: SearchFiltersProps) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 w-full mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter watchlist by title..."
            className="w-full bg-background-input border border-border focus:border-brand-gold-light focus:outline-none rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 transition"
          />
        </div>
        <div className="flex items-center gap-2 bg-background-card border border-border rounded-md px-3 py-2 text-sm text-slate-300">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <span className="text-slate-400 text-xs mr-1">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
          >
            <option value="addedAt" className="bg-background-card">Date Added</option>
            <option value="rating" className="bg-background-card">Rating</option>
          </select>
        </div>
      </div>
    );
  }
  ```

### 5. Movie Card Component (`src/components/MovieCard.tsx`)
- Displays the movie poster, title, rating, added date, and a source URL reel link.
- Fallback UI if `posterUrl` fails to render or is missing.
- Delete button placeholder to trigger removal from state.
- **Draft Mock Interface**:
  ```tsx
  import React from 'react';
  import { Star, ExternalLink, Trash2 } from 'lucide-react';

  export interface Movie {
    id: string;
    title: string;
    posterUrl?: string;
    rating?: string;
    sourceUrl?: string;
    addedAt: string;
  }

  interface MovieCardProps {
    movie: Movie;
    onDelete: (id: string) => void;
  }

  export default function MovieCard({ movie, onDelete }: MovieCardProps) {
    return (
      <div className="group relative bg-background-card border border-border hover:border-brand-gold-light/50 rounded-lg overflow-hidden transition shadow-card flex flex-col">
        {/* Poster Image Container */}
        <div className="relative aspect-[2/3] w-full bg-slate-900 overflow-hidden flex items-center justify-center text-slate-600">
          {movie.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={movie.posterUrl} 
              alt={movie.title} 
              className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
            />
          ) : (
            <span className="text-xs">No Poster Available</span>
          )}

          {/* Rating Badge */}
          {movie.rating && (
            <div className="absolute top-2 right-2 bg-slate-950/90 border border-brand-gold-light/30 backdrop-blur px-2 py-1 rounded flex items-center gap-1 text-xs font-semibold text-brand-gold-light">
              <Star className="h-3 w-3 fill-current" />
              <span>{movie.rating}</span>
            </div>
          )}

          {/* Action Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            {movie.sourceUrl && (
              <a
                href={movie.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-950 hover:bg-slate-900 border border-border p-2.5 rounded-full text-slate-200 hover:text-white transition"
                title="View original Instagram Reel"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
            <button
              onClick={() => onDelete(movie.id)}
              className="bg-red-950/80 hover:bg-red-950 border border-red-900/50 p-2.5 rounded-full text-red-400 hover:text-red-300 transition"
              title="Delete from Watchlist"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Info */}
        <div className="p-4 flex flex-col flex-1 justify-between">
          <h3 className="font-semibold text-slate-100 group-hover:text-brand-gold-light transition line-clamp-1 text-base">
            {movie.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Added on {new Date(movie.addedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }
  ```

### 6. Add Movie Modal Component (`src/components/ImportModal.tsx`)
- An overlay capturing Instagram Reels URL input.
- **States**:
  - Validation error if format does not start with `instagram.com/reel/` or similar.
  - Importing spinner state.
- **Draft Mock Interface**:
  ```tsx
  import React, { useState } from 'react';
  import { X, Link2, Sparkles } from 'lucide-react';

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

      // Simple URL validation
      if (!url.trim()) {
        setError('Please enter a Reel URL');
        return;
      }
      if (!url.includes('instagram.com/reel/')) {
        setError('Must be a valid Instagram Reel URL (e.g. instagram.com/reel/...)');
        return;
      }

      setLoading(true);
      try {
        await onImport(url);
        setUrl('');
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to extract movie from Reel');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
        
        {/* Dialog Content */}
        <div className="relative w-full max-w-md bg-background-card border border-border p-6 rounded-lg shadow-2xl z-10">
          <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
          
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-brand-gold-light" />
            <span>Import Movie from Reel</span>
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Paste an Instagram Reel URL containing the movie name. We will extract, fetch details, and add it to your watchlist.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Instagram Reel URL</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  className="w-full bg-background-input border border-border focus:border-brand-gold-light focus:outline-none rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition"
                  disabled={loading}
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-transparent hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-md text-sm transition"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-medium px-4 py-2 rounded-md text-sm transition flex items-center gap-2"
                disabled={loading}
              >
                {loading ? 'Extracting...' : 'Import Movie'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  ```

---

## 5. Responsiveness Plan

The dashboard layout utilizes mobile-first styling principles with Tailwind breakpoints:

| Viewport | Range | Columns / Layout Adjustments | Spacing / Density |
|---|---|---|---|
| **Mobile** | `< 640px` | - Single column list or 2-column small grids (`grid-cols-1` or `grid-cols-2` base).<br>- Search & filter stack vertically.<br>- Header logo and button row wrap if screen is very narrow.<br>- Modals center or act as bottom drawers. | `px-4`, compact padding, `gap-4`. |
| **Tablet** | `640px - 1024px` | - 2 to 3 columns (`sm:grid-cols-2 md:grid-cols-3`).<br>- Search & Filter align horizontally.<br>- Header displays demo user email badge. | `px-6`, standard spacing, `gap-6`. |
| **Desktop** | `> 1024px` | - 4 to 5 columns (`lg:grid-cols-4 xl:grid-cols-5`).<br>- Layout capped using `max-w-7xl mx-auto`. | `px-8`, generous margins. |

---

## 6. Implementation Checklist for Worker Agent
The following step-by-step procedure is proposed for the implementer:
1. **Config setup**: Create `package.json`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, and `next.config.mjs` in the workspace root.
2. **Install modules**: Run `npm install` to set up all node modules.
3. **Core files**: Create `src/app/globals.css` and `src/app/layout.tsx`.
4. **Mock implementation**:
   - Create `src/components/Header.tsx`, `src/components/SearchFilters.tsx`, `src/components/MovieCard.tsx`, and `src/components/ImportModal.tsx`.
   - Update `src/app/page.tsx` to handle state for mock movie data, filtering, and triggering the modal.
5. **Verify**: Run `npm run build` to verify standard Next.js compiler builds without type issues.
