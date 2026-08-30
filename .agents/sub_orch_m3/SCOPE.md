# Scope: Milestone M3 — Pipeline & Mocks

## Objectives
- Implement the movie extraction pipeline (`PipelineService`) under `src/lib/pipeline/`.
- Break the pipeline into three distinct phases:
  1. Scraping (Instagram post text extraction).
  2. NLP Information Extraction (extract movie title from text).
  3. Metadata Decoration (fetch poster and ratings).
- Implement robust local mock simulators for the three phases (returning high-fidelity mocked responses for known mock URLs, and clean simulated logs/placeholders for unknown URLs).
- Ensure all services fall back to real API keys (Apify, Gemini, TMDB/OMDB) if configured via environment variables, but work flawlessly in mock mode offline.
- Add validation/unit tests for the pipeline process in offline mode.

## Dependencies
- none

## Interfaces
- Pipeline Interface (`src/lib/pipeline/`)

## Status
- IN_PROGRESS
