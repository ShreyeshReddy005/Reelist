# Reelist. 🎬
> **Bypass streaming choice paralysis by instantly turning Instagram Reels into actionable movie watchlists.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini API](https://img.shields.io/badge/AI-Google_Gemini_Flash-blue?logo=google)](https://deepmind.google/technologies/gemini/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase_Edge-FFCA28?logo=firebase)](https://firebase.google.com/)

Reelist is a cinematic, AI-powered web application designed to solve the modern dilemma of "what to watch." Instead of endlessly scrolling through Netflix carousels, users can simply paste an Instagram Reel url containing movie recommendations, and Reelist's AI engine will automatically extract the titles, fetch the metadata, and organize them into a beautiful, anti-scroll grid.

## ✨ Features

- **🧠 Zero-Hallucination AI Extraction:** Powered by Google's Gemini Flash LLM (running at `temperature: 0` for strict, logical accuracy). It parses messy social media captions and comments to accurately extract buried film titles.
- **⚡ Sub-Second Scraping Engine:** A resilient, multi-agent SSR extraction pipeline that bypasses Instagram's strict platform restrictions by firing parallel requests, resolving in milliseconds.
- **🛡️ Edge Authentication:** Completely secure API routes powered by custom Firebase Edge Middleware deployed on Vercel, bypassing third-party cookie restrictions.
- **🎨 Cinematic UI/UX:** A world-class, Netflix-inspired interface built with Tailwind CSS. It replaces endless carousels with a decisive grid layout to completely eliminate choice fatigue.
- **🍿 Universal Streaming Links:** Automatically aggregates streaming providers (Netflix, Hulu, Max, etc.) via TMDB and Watchmode APIs, so you know exactly where to watch.

## 🛠 Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Authentication:** [Firebase](https://firebase.google.com/) + `next-firebase-auth-edge`
- **AI Engine:** [Google Gemini API](https://aistudio.google.com/)
- **Scraping Infrastructure:** [Apify](https://apify.com/) & Custom SSR Multi-Agent Fetch
- **Movie Metadata:** [TMDB API](https://www.themoviedb.org/documentation/api) & Watchmode API

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/ShreyeshReddy005/Reelist.git
cd Reelist
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and populate it with your API keys:

```env
# AI & Extraction
GEMINI_API_KEY=your_gemini_api_key
APIFY_TOKEN=your_apify_token

# Movie Data
TMDB_API_KEY=your_tmdb_api_key
OMDB_API_KEY=your_omdb_api_key
WATCHMODE_API_KEY=your_watchmode_api_key

# Firebase Auth
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📐 Architecture & Micro-Perfections

Reelist was built with an obsession for speed and accuracy:
- **Parallel Promise.any Scraping:** Instead of sequentially iterating through User-Agents to scrape protected HTML, Reelist fires them in parallel and instantly accepts the fastest successful response, dropping scrape times from 10s+ to < 1s.
- **Dynamic Auth Bypassing:** Solved Next.js 14 ESM module bundling conflicts with `firebase-admin` by pivoting to edge-compatible JWT validation via `next-firebase-auth-edge`, securing API routes without client-side race conditions.

---
*Designed & Engineered to eliminate choice paralysis.*
