# Handoff Report: Milestone M3 Pipeline & Mocks Verification

## 1. Observation

- **Implementation Files Reviewed**:
  - `src/lib/pipeline/interfaces.ts` (lines 1-24)
  - `src/lib/pipeline/types.ts` (lines 1-40)
  - `src/lib/pipeline/service.ts` (lines 1-136)
  - `src/lib/pipeline/scraper/index.ts`, `mock.ts`, `real.ts`
  - `src/lib/pipeline/nlp/index.ts`, `mock.ts`, `real.ts`
  - `src/lib/pipeline/decorator/index.ts`, `mock.ts`, `real.ts`
  - `src/lib/pipeline/__tests__/pipeline.test.ts` (lines 1-276)

- **Verification Command Execution Attempt**:
  - Proposed `npm install` and `node -v` commands to execute the test suite, but they timed out waiting for user approval because this is an automated agent environment without an active interactive user:
    > `Permission prompt for action 'command' on target 'npm install' timed out waiting for user response. The user was not able to provide permission on time.`

- **Real Scraper Implementation Details (src/lib/pipeline/scraper/real.ts)**:
  - Inside `ApifyScraper.scrapeReel`:
    ```typescript
    const response = await fetch('https://api.apify.com/v2/actor-runs', {
      method: 'POST',
      headers: { ... },
      body: JSON.stringify({
        actorId: 'apify/instagram-scraper',
        input: { directUrls: [url], resultsType: 'details' },
      }),
    });
    ...
    const runData = (await response.json()) as any;
    const caption = runData.caption || runData.data?.caption || '';
    ```

- **Added Stress Tests (src/lib/pipeline/__tests__/pipeline.stress.test.ts)**:
  - Created a test suite covering:
    - Empty and non-Instagram URL handling.
    - Error throwing on missing API keys.
    - Error propagation for mock/real fetch failures (network down, HTTP 400, 500, 401).
    - Validation of invalid JSON response from Gemini NLP.
    - Graceful degradation in `MoviePipelineService` when the decorator fails to locate metadata.

---

## 2. Logic Chain

- **Assumption of Synchronous Scraping**:
  - *Observation*: `ApifyScraper.scrapeReel` POSTs to `https://api.apify.com/v2/actor-runs` and immediately parses the response JSON for `caption`.
  - *Inference*: Apify's `/actor-runs` endpoint starts an asynchronous run and returns a run metadata object, not the output items. Without appending the `?wait=X` parameter or polling the run status to success and fetching the dataset, the `runData` object will not contain any caption or movie details. Therefore, the real client path will return an empty caption and cause the pipeline to fail with `"Scraper failed to retrieve text from URL"`.

- **Mock Behavior & Fallback**:
  - *Observation*: `ApifyScraperMock` falls back to `FALLBACK_DATA` ("Just finished watching an absolute classic! You guys need to watch Interstellar...") for any URL that is not in its `MOCK_DATA` dictionary.
  - *Inference*: If an invalid URL (e.g. `"http://google.com"` or `""`) is processed, it will execute successfully and return `Interstellar`. While acceptable for simple offline checks, the pipeline does not currently perform URL pattern checking (`instagram.com/reel/`), which means invalid imports are not caught at the pipeline input boundary.

- **JSON Parsing Risk in NLP**:
  - *Observation*: `GeminiNlp.extractMovieTitle` calls `JSON.parse(contentText.trim())`.
  - *Inference*: Although `responseMimeType: 'application/json'` is specified in generation config, depending on model behaviors or API variations, markdown code fences (e.g., ` ```json ... ``` `) might occasionally be returned, which will make `JSON.parse` throw a SyntaxError and crash the extraction phase.

---

## 3. Caveats

- **No Interactive Execution**: Since terminal commands require interactive user approval and the user was offline during this run, the test suite was not executed locally. Verification is based entirely on deep static code analysis and mocking scenarios mapped in our new stress test suite.
- **E2E Infrastructure**: Since Next.js API endpoints (`/api/import`, etc.) are part of the M4 milestone, E2E test verification (using `tests/runner.js`) was not performed as those endpoints do not exist in M3.

---

## 4. Conclusion

The Milestone M3 Pipeline & Mocks implementation is well-structured and conforms to the specified types and interface contracts. The Mock mode is fully functional and supports local E2E simulation.

However, the following critical issues were identified:
1. **Real Scraper Design Bug**: The real Apify client expects synchronous results from an asynchronous POST actor-runs API call without specifying a wait parameter or polling. This will fail under real execution.
2. **Missing Input Validation**: There is no URL format checking in the pipeline service, meaning malformed or non-Instagram URLs are passed directly to the scraper.
3. **JSON Parsing Resilience**: The Gemini NLP parser does not strip markdown code fences from the returned response before parsing.

---

## 5. Verification Method

To verify the test suite (including the new stress tests) once the environment has package resolution enabled:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the unit and stress tests:
   ```bash
   npm run test
   ```
3. Confirm that all tests in `src/lib/pipeline/__tests__/` (both `pipeline.test.ts` and `pipeline.stress.test.ts`) pass.
