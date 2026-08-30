# Milestone M3 Analysis — Pipeline & Mocks

This document presents the design and strategy for the intelligent movie extraction pipeline (`PipelineService`) and its offline mock simulators.

---

## 1. Requirements & Findings Analysis

The primary objective of Milestone M3 is to build an intelligent extraction pipeline that takes an Instagram Reel URL and extracts movie details (title, poster, ratings) in a structured manner. The pipeline has three distinct phases:

1. **Scraping Phase**: Extract text from an Instagram Reel URL.
2. **NLP Extraction Phase**: Extract the movie title from the post caption.
3. **Metadata Decoration Phase**: Query poster and rating metadata using the movie title.

### Key Findings & Constraints
- **Offline Reliability**: The pipeline must run completely offline in a local environment. It must not make real API calls when configured for mock mode or when API keys are absent.
- **High-Fidelity Mocks**: For development and end-to-end testing, specific mock URLs must return realistic data (realistic captions, correct movie titles, real TMDB/OMDB posters and ratings).
- **Graceful Fallbacks**:
  - Unknown URLs should return structured placeholders instead of failing.
  - If real API keys are present (e.g. in `.env.local`), the service must dynamically switch to real API clients (Apify, Gemini, TMDB/OMDB).
- **No Side-Effects in Explorer Phase**: All designs, interfaces, and mock payloads are detailed here. No files in `src/` or `tests/` will be created or edited by the explorer agent.

---

## 2. Proposed Module Structure

To ensure high testability, clean separation of concerns, and mock/real toggling, we propose a modular structure where each phase is decoupled and has its own folder containing the interface, mock implementation, and real integration.

```
src/
└── lib/
    └── pipeline/
        ├── types.ts                   # Unified type definitions
        ├── interfaces.ts              # Service interfaces for each phase
        ├── service.ts                 # Main PipelineService implementation
        ├── scraper/
        │   ├── index.ts               # Scraper service factory
        │   ├── mock.ts                # Mock Instagram scraper implementation
        │   └── real.ts                # Real Apify Instagram scraper client
        ├── nlp/
        │   ├── index.ts               # NLP service factory
        │   ├── mock.ts                # Mock Gemini NLP extractor
        │   └── real.ts                # Real Gemini NLP client
        ├── decorator/
        │   ├── index.ts               # Decorator service factory
        │   ├── mock.ts                # Mock TMDB/OMDB decorator
        │   └── real.ts                # Real TMDB/OMDB API client
        └── __tests__/                 # Co-located unit and integration tests
            ├── service.test.ts        # Integration test for main pipeline
            ├── scraper.test.ts        # Scraper unit & fallback tests
            ├── nlp.test.ts            # NLP unit & fallback tests
            └── decorator.test.ts      # Decorator unit & fallback tests
```

---

## 3. Interface Designs

The TypeScript interfaces are designed to enforce a clear contract at each stage of the pipeline, supporting dependency injection for test verification.

### Core Type Definitions (`src/lib/pipeline/types.ts`)
```typescript
export interface ExtractedMovie {
  title: string;
  posterUrl?: string;
  rating?: string;
  sourceUrl: string;
}

export interface ScraperResult {
  rawText: string;
  sourceUrl: string;
  metadata?: {
    username?: string;
    likeCount?: number;
    timestamp?: string;
  };
}

export interface NlpResult {
  title: string;
  confidence: number;
  extractedKeywords?: string[];
}

export interface MovieMetadata {
  title: string;
  posterUrl?: string;
  rating?: string; // Format: "IMDb: X.X, RT: Y%"
  plotSummary?: string;
  releaseYear?: string;
}

export interface PipelineStepLog {
  step: 'scraping' | 'nlp' | 'decoration';
  status: 'success' | 'failure';
  input: any;
  output: any;
  durationMs: number;
  error?: string;
}
```

### Phase-Level Service Interfaces (`src/lib/pipeline/interfaces.ts`)
```typescript
import { ScraperResult, NlpResult, MovieMetadata } from './types';

export interface ScraperService {
  scrapeReel(url: string): Promise<ScraperResult>;
}

export interface NlpService {
  extractMovieTitle(text: string): Promise<NlpResult>;
}

export interface MetadataDecoratorService {
  decorateMovie(title: string): Promise<MovieMetadata>;
}

export interface PipelineService {
  processReelUrl(url: string): Promise<ExtractedMovie>;
}
```

### Trace Logging (Observability)
To track pipeline execution progress, a simple observer or logger can be injected:
```typescript
export interface PipelineLogger {
  logStep(log: PipelineStepLog): void;
  getLogs(): PipelineStepLog[];
  clear(): void;
}
```

---

## 4. Mock Inputs and Outputs

The mock simulators rely on a high-fidelity static database. 

### High-Fidelity Known Reels Database
The mock services will share or duplicate this hardcoded data mapping:

| Input URL | Scraper Raw Text Output | NLP Extracted Title | Decorator Output (Poster & Ratings) |
|---|---|---|---|
| `https://www.instagram.com/reel/C3b5GhMxYzK/` | `"OMG this movie was crazy! You have to see Inception (2010) directed by Christopher Nolan. The dream scenes are unbelievable. Leo's performance is top-tier! #inception #scifi"` | `"Inception"` | **Poster**: `https://image.tmdb.org/t/p/w500/o0Q7f6H1V244K1j945CzWj66aP5.jpg`<br>**Rating**: `"IMDb: 8.8, RT: 87%"` |
| `https://www.instagram.com/reel/C4d8FkLxZaP/` | `"If you haven't seen The Matrix (1999) yet, what are you doing? Absolute masterpiece. Red pill or blue pill? Cyberpunk vibes are so good. #thematrix"` | `"The Matrix"` | **Poster**: `https://image.tmdb.org/t/p/w500/f89U3wzqrjFmZ94eEW36pct8ILV.jpg`<br>**Rating**: `"IMDb: 8.7, RT: 83%"` |
| `https://www.instagram.com/reel/C5e9GlMxAbQ/` | `"Still thinking about Parasite (2019). Bong Joon-ho's direction is brilliant. This film deserves all the hype and the Oscar it won. #parasite #foreignfilm"` | `"Parasite"` | **Poster**: `https://image.tmdb.org/t/p/w500/7IiTTvv7fXee3u7q6sbz0ZwsZXI.jpg`<br>**Rating**: `"IMDb: 8.5, RT: 99%"` |

### Unknown/Fallback Behavior
To prevent crashes during offline testing when arbitrary inputs are submitted:

1. **Scraper Mock (Unknown URL)**:
   Returns a default post caption referencing a known fallback movie:
   - **Output rawText**: `"Just finished watching an absolute classic! You guys need to watch Interstellar (2014) tonight. The soundtrack is spectacular. #interstellar #sci-fi"`
2. **NLP Mock (Unknown Caption)**:
   Uses standard regex parsing (e.g., matching capitalized strings or movie patterns) or falls back to returning `"Interstellar"` if it detects the scraper fallback text.
3. **Decorator Mock (Unknown Title)**:
   If the title is `"Interstellar"`, it returns real-world metadata:
   - **Poster**: `https://image.tmdb.org/t/p/w500/gEU2Qv61XZvge7o5JjuiGrtclq1.jpg`
   - **Rating**: `"IMDb: 8.6, RT: 73%"`
   If the title is completely random and unrecognized, it returns a generic placeholder object:
   - **Poster**: `/assets/images/placeholder-poster.png`
   - **Rating**: `"Rating: N/A"`

### Boundary Corner-Case URL
For negative test validation, we design a specific URL that triggers a failure:
- **Input URL**: `https://www.instagram.com/reel/no_movie_here/`
- **Scraper Mock**: `"Enjoying a sunny day at the beach with friends! #summer #weekend #vacation"`
- **NLP Mock**: Cannot find a movie title. Returns title: `""`, confidence: `0.0`.
- **Pipeline behavior**: Detects empty title and throws `Error("No movie title could be extracted from this Reel.")`.

---

## 5. Implementation Strategy & Fallback Mechanics

### Factory Dynamic Toggle Logic
Each service folder will expose a factory function in its `index.ts` file. This function resolves whether to return the Mock or Real service based on two parameters:
1. An explicit global toggle `MOCK_MODE=true` (ideal for testing).
2. The presence or absence of the specific API key required for that stage.

Here is the pseudo-code design for the factories:

```typescript
// src/lib/pipeline/scraper/index.ts
export function createScraperService(): ScraperService {
  const apiKey = process.env.APIFY_API_KEY;
  const isMockMode = process.env.MOCK_MODE === 'true';

  if (isMockMode || !apiKey) {
    return new ApifyScraperMock();
  }
  return new ApifyScraper(apiKey);
}

// src/lib/pipeline/nlp/index.ts
export function createNlpService(): NlpService {
  const apiKey = process.env.GEMINI_API_KEY;
  const isMockMode = process.env.MOCK_MODE === 'true';

  if (isMockMode || !apiKey) {
    return new GeminiNlpMock();
  }
  return new GeminiNlp(apiKey);
}

// src/lib/pipeline/decorator/index.ts
export function createMetadataDecoratorService(): MetadataDecoratorService {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  const isMockMode = process.env.MOCK_MODE === 'true';

  if (isMockMode || (!tmdbKey && !omdbKey)) {
    return new MetadataDecoratorMock();
  }
  return new MetadataDecorator({ tmdbKey, omdbKey });
}
```

### Main Pipeline Orchestrator (`src/lib/pipeline/service.ts`)
The `MoviePipelineService` integrates the three sub-services. It implements standard Dependency Injection to allow tests to pass custom mocks directly.

```typescript
export class MoviePipelineService implements PipelineService {
  private scraper: ScraperService;
  private nlp: NlpService;
  private decorator: MetadataDecoratorService;

  constructor(
    scraper?: ScraperService,
    nlp?: NlpService,
    decorator?: MetadataDecoratorService
  ) {
    this.scraper = scraper ?? createScraperService();
    this.nlp = nlp ?? createNlpService();
    this.decorator = decorator ?? createMetadataDecoratorService();
  }

  async processReelUrl(url: string): Promise<ExtractedMovie> {
    // 1. Scrape
    const scraperResult = await this.scraper.scrapeReel(url);
    if (!scraperResult.rawText) {
      throw new Error(`Scraper failed to retrieve text from URL: ${url}`);
    }

    // 2. Extract title
    const nlpResult = await this.nlp.extractMovieTitle(scraperResult.rawText);
    if (!nlpResult.title) {
      throw new Error("Pipeline failed: No movie title could be extracted from post text.");
    }

    // 3. Decorate metadata
    const metadata = await this.decorator.decorateMovie(nlpResult.title);

    return {
      title: metadata.title || nlpResult.title,
      posterUrl: metadata.posterUrl,
      rating: metadata.rating,
      sourceUrl: url
    };
  }
}
```

---

## 6. Unit Testing Strategy

All unit tests must run completely offline without hitting real external network endpoints. We propose using Vitest (or Jest) for running unit and integration tests.

### Test Coverage Plan

#### 1. Integration Tests (`service.test.ts`)
- **Known Reels E2E Flow**: Verify that passing a known mock URL (e.g., `https://www.instagram.com/reel/C3b5GhMxYzK/`) resolves to the exact expected `ExtractedMovie` payload (Inception) in under three mock stages.
- **Unknown Reels E2E Flow**: Verify that passing `https://www.instagram.com/reel/xyz123/` succeeds and returns the fallback metadata (Interstellar).
- **Error Handling Flow**: Verify that passing the negative corner-case URL `https://www.instagram.com/reel/no_movie_here/` throws a validation error indicating that no movie title could be extracted.

#### 2. Service Factory & Fallback Tests
- **Factory Mock Selection**: Test that the factories return mock instances if API keys are undefined or if `MOCK_MODE=true` is set.
- **Factory Real Selection**: Test that the factories return real client instances if API keys are present (by checking the constructor class name or instance properties).
- *Mocking Environment Variables*: Use `vi.stubEnv` or `process.env` overrides to test factory state toggling:
  ```typescript
  describe('Scraper Factory', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    test('should return mock instance when key is missing', () => {
      vi.stubEnv('APIFY_API_KEY', '');
      const service = createScraperService();
      expect(service.constructor.name).toBe('ApifyScraperMock');
    });

    test('should return real instance when key is present', () => {
      vi.stubEnv('APIFY_API_KEY', 'apify_test_token_123');
      vi.stubEnv('MOCK_MODE', 'false');
      const service = createScraperService();
      expect(service.constructor.name).toBe('ApifyScraper');
    });
  });
  ```

#### 3. Real Client Offline Tests (Mocking HTTP Clients)
To test that the real API integration logic is sound without hitting real servers, we mock the network requests:
- **Apify Client Test**: Mock the external fetch call to `https://api.apify.com/v2/actor-runs` and assert that the client adds the correct `Authorization` headers.
- **Gemini NLP Test**: Mock the Google Generative AI SDK client or the REST endpoint `https://generativelanguage.googleapis.com` to return a mocked Gemini JSON schema response.
- **TMDB Decorator Test**: Mock fetch calls to TMDB's search endpoint `/3/search/movie` and assert that it correctly handles pagination or retrieves the poster path and constructs the absolute poster URL.
