# Project: Reelist Elite

An elite, world-class movie watchlist application that solves the friction between discovering movies on Instagram Reels and tracking them, utilizing Next.js, Tailwind CSS, Supabase (with local/mock offline fallbacks), Apify, Gemini NLP, and TMDB/OMDB.

## Architecture
Reelist Elite follows a decoupled, service-oriented architecture:
- **UI/UX Layer**: A clean, responsive Next.js application using Tailwind CSS. Focuses on an 80/20 design philosophy with a distraction-free watchlist dashboard and a 1-click URL import modal.
- **Auth Service**: Managed session state. Integrates with Supabase Auth or switches to a local mock auth provider for offline test validation.
- **Database Layer**: Persists user profiles and watchlists. Interfaces with Supabase Database or switches to a local SQLite/JSON database client when running offline.
- **Intelligent Pipeline**:
  1. **Scraping**: Extracts video/post caption text from an Instagram Reel URL (via Apify scraper).
  2. **NLP Extraction**: Extracts movie title and details from post caption (via Gemini API).
  3. **Metadata Decoration**: Resolves the title to movie poster and rating metadata (via TMDB/OMDB API).
  All three pipeline steps implement strict mock simulation modes to allow full local development and E2E testing without external dependencies.

## Code Layout
```
reelist_elite/
├── .agents/                 # Coordinating agent files (coordination metadata only)
├── src/
│   ├── app/                 # Next.js App Router (pages, layout, routing)
│   ├── components/          # React components (Dashboard, MovieCard, ImportModal, UI elements)
│   └── lib/                 # Core business logic and integrations
│       ├── auth/            # Auth controllers and mock provider
│       ├── db/              # Database models, schemas, and local fallback/SQLite client
│       └── pipeline/        # Scraper, NLP, TMDB metadata wrapper, and local mock definitions
├── tests/                   # E2E and integration tests
│   ├── fixtures/            # Mock Reel URLs and API payloads
│   ├── tier1/               # Feature coverage tests
│   ├── tier2/               # Boundary and corner case tests
│   ├── tier3/               # Cross-feature combination tests
│   ├── tier4/               # Real-world workload tests
│   └── runner.js            # Independent E2E test runner
├── package.json             # Workspace dependencies and scripts
├── tailwind.config.js       # Design system spacing, colors, typography
└── tsconfig.json            # TypeScript configuration
```

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | UI/UX Foundation | Setup Next.js, Tailwind, Design System, static Dashboard and Import Modal | none | IN_PROGRESS (Conv: 6dace492-398b-477b-9a63-85e77c6bf7ef) |
| M2 | Local Auth & DB Layer | Setup local database schema, authentication wrapper, and Mock Auth Provider | none | IN_PROGRESS (Conv: af822060-6ebd-4553-b631-f7b2de3e248d) |
| M3 | Pipeline & Mocks | Setup Apify, Gemini, TMDB integrations and their robust local offline simulation modules | none | IN_PROGRESS (Conv: 7eebe6b2-35a3-4695-8e45-377e01df5a15) |
| M4 | Workflow Integration | Connect UI to the database/auth layer and pipeline for "under 3 clicks" Reel URL import | M1, M2, M3 | PLANNED |
| M5 | Final Milestone | Pass 100% of E2E tests (Tiers 1-4) and undergo Tier 5 adversarial coverage hardening | M4, E2E-Track | PLANNED |
| E2E | E2E Test Suite | Design independent E2E test runner and write Tiers 1-4 tests to produce TEST_READY.md | none | IN_PROGRESS (Conv: bfebbe79-1787-4c4a-a303-8b2e47186dfd) |

## Interface Contracts

### Auth Interface
```typescript
interface UserSession {
  user: { id: string; email: string } | null;
  token: string | null;
}

interface AuthProvider {
  signUp(email: string, password: string): Promise<UserSession>;
  signIn(email: string, password: string): Promise<UserSession>;
  signOut(): Promise<void>;
  getSession(): Promise<UserSession>;
}
```

### Database Interface
```typescript
interface Movie {
  id: string;
  title: string;
  posterUrl?: string;
  rating?: string;
  sourceUrl?: string;
  addedAt: string;
}

interface DatabaseProvider {
  getWatchlist(userId: string): Promise<Movie[]>;
  addMovie(userId: string, movie: Omit<Movie, 'id' | 'addedAt'>): Promise<Movie>;
  removeMovie(userId: string, movieId: string): Promise<void>;
}
```

### Pipeline Interface
```typescript
interface ExtractedMovie {
  title: string;
  posterUrl?: string;
  rating?: string;
  sourceUrl: string;
}

interface PipelineService {
  processReelUrl(url: string): Promise<ExtractedMovie>;
}
```
