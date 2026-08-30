# Reelist Elite UI/UX Foundation Analysis & Architecture Plan

## Executive Summary
This report provides a comprehensive blueprint for establishing the UI/UX foundation of **Reelist Elite** using Next.js 14 (App Router), Tailwind CSS, and TypeScript. By employing an 80/20 design system with a dark cinematic theme and a highly responsive, component-driven layout, we lay the groundwork for a frictionless movie watchlist that integrates with mock auth and database interfaces.

---

## 1. Current State Assessment
We scanned the workspace root (`C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite`) to identify any pre-existing Node or Next.js configurations. 

### Findings:
- **Project Structure**: The workspace root contains only `.agents/`, `PROJECT.md`, and `plan.md`. There are no code files, source folders, or configuration files (no `package.json`, `tsconfig.json`, or `tailwind.config.js`).
- **Dependencies**: No pre-existing npm packages or configuration files are present in the root. The project is a greenfield setup.
- **Environment**: Due to a permission prompt timeout, we could not execute `node -v` or `npm -v`. The implementation plan will assume a standard Node.js LTS environment (Node >= 18.17.0, npm >= 9.x, or yarn/pnpm equivalent).

---

## 2. Next.js, Tailwind, & TypeScript Setup Strategy

### Bypassing Folder Non-Empty Restriction
Because `create-next-app` fails when run in a directory that already contains files (such as `PROJECT.md` and `.agents/`), the initialization must be done in a temporary subdirectory and then merged into the root.

#### Recommended Commands:
1. **Initialize in a temporary subdirectory**:
   ```bash
   npx create-next-app@14.2.3 temp-init --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   ```
   *Note: Using a specific Next.js version like `14.2.3` provides a stable React 18 base, avoiding experimental React 19 builds that may conflict with older styling utilities.*

2. **Move files to the workspace root**:
   On Windows PowerShell:
   ```powershell
   # Move all top-level files and folders (including hidden files like .eslintrc.json, .gitignore)
   Get-ChildItem -Path .\temp-init\ -Recurse | ForEach-Object {
       $dest = $_.FullName.Replace("temp-init", ".")
       if ($_.PsIsContainer) {
           if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest }
       } else {
           Copy-Item $_.FullName -Destination $dest -Force
       }
   }
   # Remove temporary directory
   Remove-Item -Recurse -Force .\temp-init
   ```

3. **Install UI Utilities**:
   ```bash
   npm install lucide-react clsx tailwind-merge
   ```
   - `lucide-react`: For clean, modern UI icons (movie reel, search, filter, trash, user, loading, plus).
   - `clsx` and `tailwind-merge`: Essential for dynamically combining Tailwind classes without style conflicts.

### Offline-Friendly & Standard Fallbacks
If internet connectivity is limited, the Next.js setup can be manual:
1. Create a minimal `package.json` specifying React 18, Next 14, Tailwind 3, and TypeScript 5.
2. Manually write `tsconfig.json`, `postcss.config.js`, and `tailwind.config.js`.
3. Create `src/app/layout.tsx`, `src/app/page.tsx`, and `src/app/globals.css`.
4. Run `npm install` targeting local offline npm caches if available.

---

## 3. The 80/20 Design System (`tailwind.config.js`)
To achieve an elegant, high-contrast visual layout with minimal complexity, we define the design system using Tailwind CSS config tokens. The design emphasizes a dark cinematic theme (60% background, 30% surfaces, 10% accent).

### Color Palette (60-30-10 Rule)
- **Dominant (60% - Background)**: Deep velvet dark grey/black (`#09090b`) to emulate a premium dark theater environment.
- **Secondary (30% - Surface & Contrast)**: Card backgrounds (`#18181b`), thin borders (`#27272a`), primary text (`#f4f4f5`), and secondary text (`#a1a1aa`).
- **Accent (10% - Action & Highlight)**: Cinematic violet/indigo (`#8b5cf6`) and gold/amber (`#f59e0b`) for primary actions, badges, and high-priority feedback.

### Spacing & Borders
- **Spacing**: 4px grid (using standard Tailwind multipliers: `p-2` = 8px, `p-4` = 16px, `p-6` = 24px).
- **Rounding**: Large border-radius (`rounded-xl` for cards, `rounded-lg` for buttons) to convey a premium, modern feel.

### Config Template (`tailwind.config.ts`)
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b", // zinc-950
        surface: {
          DEFAULT: "#18181b", // zinc-900
          hover: "#27272a", // zinc-800
        },
        border: "#27272a", // zinc-800
        accent: {
          DEFAULT: "#8b5cf6", // violet-500
          hover: "#7c3aed", // violet-600
          gold: "#f59e0b", // amber-500 (ratings)
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
      },
      aspectRatio: {
        poster: "2 / 3", // Standard theatrical movie poster aspect ratio
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 4. UI Component & Layout Architecture
To satisfy the requirements of Milestone M1, we organize the user interface into reusable, static React components. The layouts consume mock data structured according to the interface contracts in `PROJECT.md`.

### Component Directory Tree
```
reelist_elite/
└── src/
    ├── app/
    │   ├── globals.css        # Base styles, Tailwind directives, custom scrollbars
    │   ├── layout.tsx         # Root layout with HTML/Body wrapper and global state providers
    │   └── page.tsx           # Dashboard landing page orchestrating layout views
    └── components/
        ├── Header.tsx         # Sticky navigation, logo, and auth session state representation
        ├── SearchFilters.tsx  # Dynamic search bar, genre filtering, and sorting inputs
        ├── WatchlistGrid.tsx  # Grid wrapper handling empty states and card listing
        ├── MovieCard.tsx      # Individual movie display, aspect-ratio poster, ratings, and actions
        └── AddMovieModal.tsx  # Dialog popup for pasting Instagram Reel URLs and manual imports
```

### Component Breakdown & UI Mock Implementation Specs

#### 1. Root Layout (`src/app/layout.tsx`)
Sets up a global responsive frame.
- **Visuals**: Dark background (`bg-background text-zinc-100`), smooth scrolling, and custom dark scrollbars.
- **Responsiveness**: Ensures the content is always full-height (`min-h-screen flex flex-col`).

#### 2. Header Component (`src/components/Header.tsx`)
- **Structure**: Flex container with space-between.
- **Left Side**: Logo and title ("Reelist Elite") with a cinema reel icon.
- **Right Side**: Mock session state (matching the `UserSession` interface). Shows a user email (e.g. `user@reelist.elite`) and a logout button. If logged out, displays a "Sign In" button.
- **Tailwind Styles**: `sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 flex items-center justify-between`

#### 3. Search & Filter Bar (`src/components/SearchFilters.tsx`)
- **Structure**: Input bar with select dropdowns.
- **Elements**:
  - Text input for title search (with a leading search icon).
  - Rating filter dropdown (e.g. "All Ratings", "9+ Stars", "8+ Stars").
  - Sort dropdown ("Date Added (Newest)", "Date Added (Oldest)", "Highest Rated").
- **Tailwind Styles**: Grid or flex layout adapting from column (mobile) to row (tablet/desktop) for space optimization.

#### 4. Movie Card Component (`src/components/MovieCard.tsx`)
Renders details in the standard watchlist layout.
- **Interface Alignment**: Takes a `Movie` prop:
  ```typescript
  interface Movie {
    id: string;
    title: string;
    posterUrl?: string;
    rating?: string;
    sourceUrl?: string;
    addedAt: string;
  }
  ```
- **Visual Elements**:
  - Poster container: Enforced `aspect-poster` (`aspect-[2/3]`).
  - Hover state: Poster scales slightly (`group-hover:scale-105 transition-transform duration-300`) with a smooth dark overlay.
  - Metadata footer: Movie Title (`font-semibold text-sm line-clamp-1`), Rating Badge (`text-accent-gold` with star icon), and Source Link (with an Instagram badge icon if `sourceUrl` exists).
  - Quick action: Floating "Delete" button (trash icon) in the top-right corner appearing on hover.

#### 5. Add Movie Modal Component (`src/components/AddMovieModal.tsx`)
A dialog for importing new watchlists.
- **Trigger**: Activated by a prominent CTA button ("+ Import Reel") in the header or dashboard sidebar.
- **Inputs**:
  - Instagram Reel URL input field (`placeholder="https://www.instagram.com/reel/..."`).
  - Help text explaining the automated NLP/TMDB pipeline.
  - Secondary optional field for manual entry (title input) if the user prefers to skip scraping.
- **Tailwind Styles**: Fixed centering backdrop (`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center`), container card (`bg-surface border border-border p-6 rounded-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200`).

---

## 5. Responsiveness & Viewport Adaptation Plan
To guarantee a flawless mobile and desktop experience, the UI layouts will scale adaptively:

### 1. Watchlist Grid Columns
Using Tailwind's responsive grid system, card widths remain consistent across form factors:
- **Mobile (default)**: 1 column (`grid-cols-1`) or 2 columns (`grid-cols-2` at `xs:480px` or `sm:640px`) to prevent cards from being stretched.
- **Tablet (`md:768px`)**: 3 columns (`md:grid-cols-3`).
- **Desktop (`lg:1024px`)**: 4 columns (`lg:grid-cols-4`).
- **Widescreen (`xl:1280px`)**: Max-width bounding container `max-w-7xl mx-auto px-4`.

### 2. Search & Filters Layout
- **Mobile**: Stacks search input and dropdown filters vertically (`flex flex-col gap-3 w-full`).
- **Tablet/Desktop**: Arranges items horizontally (`md:flex-row md:items-center justify-between gap-4`). The search input expands to fill space, while dropdowns take fixed auto-widths.

### 3. Header Navigation
- **Mobile**: Icon logo, minimal user initials icon, and a floating action button (FAB) for adding movies to save horizontal viewport space.
- **Tablet/Desktop**: Full text branding, email label next to profile photo, and header-aligned CTA button.

---

## 6. Layout Compliance & Static Mock Data
As a read-only explorer, we verified that all UI files will be placed correctly under `src/app/` and `src/components/` in the implementation stage. No files will violate the `.agents/` layout constraint.

### Static Data Definition (`src/lib/mockData.ts`)
To facilitate visual testing in the UI foundation milestone, the components will render using this static list:
```typescript
import { Movie } from "@/lib/db"; // Assuming DB interface is co-located

export const mockWatchlist: Movie[] = [
  {
    id: "mock-1",
    title: "Inception",
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80",
    rating: "8.8",
    sourceUrl: "https://www.instagram.com/reel/C1234567890/",
    addedAt: "2026-06-25T12:00:00Z"
  },
  {
    id: "mock-2",
    title: "Interstellar",
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80",
    rating: "8.6",
    sourceUrl: "https://www.instagram.com/reel/D9876543210/",
    addedAt: "2026-06-26T14:30:00Z"
  },
  {
    id: "mock-3",
    title: "The Dark Knight",
    posterUrl: "", // Tests the poster placeholder fallback
    rating: "9.0",
    sourceUrl: "https://www.instagram.com/reel/E1122334455/",
    addedAt: "2026-06-27T09:15:00Z"
  }
];
```
