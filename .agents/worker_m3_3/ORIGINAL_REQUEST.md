## 2026-06-27T08:48:45Z
You are teamwork_preview_worker.
Your task is to fix and harden the Milestone M3 (Pipeline & Mocks) implementation under `src/lib/pipeline/` based on review feedback.
Your working directory is: C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite\.agents\worker_m3_3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope of work:
1. Fix `src/lib/pipeline/scraper/real.ts`:
   - Change the API call from the asynchronous actor runs endpoint to the synchronous dataset execution endpoint:
     `POST https://api.apify.com/v2/acts/apify/instagram-scraper/run-sync-get-dataset-items?token=${this.apiKey}`
   - The synchronous endpoint returns a JSON array of dataset items. Extract `caption` from the first element in the array:
     `const datasetItems = (await response.json()) as any[];`
     `const caption = datasetItems[0]?.caption || '';`
2. Fix `src/lib/pipeline/nlp/real.ts`:
   - Add robust JSON parsing to strip markdown code block fences (e.g. ````json` and ````) from the returned response text before calling `JSON.parse`.
3. Fix `src/lib/pipeline/service.ts`:
   - Add URL validation to `processReelUrl`: verify the input URL is non-empty and starts with `https://www.instagram.com/reel/` or `https://instagram.com/reel/`. Throw an error if invalid.
   - Add graceful degradation: catch any errors thrown by the metadata decorator (such as network or API key issues), log them, and fall back to returning the extracted movie with default placeholders (rating: 'Rating: N/A', posterUrl: '/assets/images/placeholder-poster.png') instead of propagating a fatal error.
4. Update unit tests in `src/lib/pipeline/__tests__/pipeline.test.ts`:
   - Update `ApifyScraper` test to mock the return of a JSON array `[{ caption: 'Inception is a great movie #inception' }]` matching the synchronous endpoint format.
   - Add test cases verifying URL validation.
   - Add test cases verifying graceful degradation on decorator failure.
5. Make sure all tests compile and pass. Run `npm install` and `npm run test` to verify.
6. Document all changes and test outputs in C:\Users\SHREYESH REDDY\.gemini\antigravity\scratch\teamwork_projects\reelist_elite\.agents\worker_m3_3\handoff.md.
