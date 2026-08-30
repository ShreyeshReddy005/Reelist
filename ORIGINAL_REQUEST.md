# Original User Request

## Initial Request — 2026-06-27T00:27:02Z

An elite, world-class movie watchlist application that solves the friction between discovering movies on Instagram and tracking them. It must surpass Netflix and Letterboxd in UI/UX simplicity, following an 80/20 design philosophy to provide an incredibly intelligent, frictionless, and beautiful experience for users.

Working directory: C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite
Integrity mode: demo

## Requirements

### R1. Elite UI/UX and Frictionless Workflow
The application must feature a radically simple, distraction-free interface (80/20 rule) that minimizes the friction of adding movies from social media (Instagram) and organizing them. The design must be visually stunning and compete with tier-1 applications like Netflix and Apple TV. The expert team is completely free to choose the tech stack (e.g., Next.js, React Native, etc.) that best achieves this world-class experience.

### R2. Backend Infrastructure & Authentication
The application must implement a robust Backend-as-a-Service (such as Supabase or Firebase) to handle user authentication, secure session management, and persistent storage of watchlists across multiple devices.

### R3. Intelligent Pipeline Integration
The application must seamlessly integrate the existing AI extraction pipeline (Apify for scraping, Gemini for NLP extraction, TMDB/OMDB for metadata), ensuring the transition from a pasted Instagram URL to a fully categorized movie card is flawless.

## Acceptance Criteria

### Elite UI/UX
- [ ] A user can add a movie via a social media URL with fewer than 3 clicks/taps.
- [ ] The interface passes a responsive design audit, rendering perfectly and beautifully on both mobile and desktop viewports.
- [ ] The design utilizes a consistent design system (typography, spacing, color palette) devoid of unnecessary visual clutter.

### Backend Infrastructure
- [ ] A user can successfully register an account and log in.
- [ ] Watchlist data is saved to the remote database and persists when the user refreshes the page or logs in from a different session.

### Pipeline Integration
- [ ] Submitting a valid Instagram Reel URL successfully triggers the extraction pipeline.
- [ ] The pipeline correctly populates the database and UI with accurate movie metadata (Title, Poster, Ratings) without crashing.
