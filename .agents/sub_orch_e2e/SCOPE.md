# Scope: E2E Testing Track — Test Suite Creation

## Architecture
- Opaque-box, requirement-driven E2E tests executing against local running Next.js application, DB APIs, and pipeline mock interface.
- Utilizes custom Node.js runner or test framework to invoke tests and report results.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | E2E_M1: Test Runner & Fixtures | Independent E2E runner setup, directory layout, mock fixtures for Reel URLs | none | DONE |
| 2 | E2E_M2: Feature Coverage (Tier 1) | >=5 test cases per feature (Auth, Watchlist, Import URL) | E2E_M1 | DONE |
| 3 | E2E_M3: Boundary Cases (Tier 2) | >=5 boundary cases per feature (invalid URL, empty, fail scraper, unauth) | E2E_M1 | IN_PROGRESS |
| 4 | E2E_M4: Cross-Feature (Tier 3) | Pairwise interactions (e.g., login, add, logout, login other session, verify) | E2E_M1 | PLANNED |
| 5 | E2E_M5: Real-World Scenarios (Tier 4) | >=5 E2E user journeys | E2E_M1 | PLANNED |
| 6 | E2E_M6: Publish Test Ready | Write TEST_INFRA.md and publish TEST_READY.md | E2E_M2, E2E_M3, E2E_M4, E2E_M5 | PLANNED |

## Interface Contracts
### E2E Test Suite ↔ Reelist Elite App
- Executes via HTTP requests or mock DB / API calls.
- Command: npm run test:e2e
