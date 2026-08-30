# Handoff Report — M1 UI/UX Foundation Challenge

## 1. Observation
Direct observations of source files and configurations:
*   **Observation 1 (Add Movie URL Validation)**: In `src/components/ImportModal.tsx` lines 26–29:
    ```typescript
    if (!url.includes('instagram.com/reel/')) {
      setError('Must be a valid Instagram Reel URL (e.g. instagram.com/reel/...)');
      return;
    }
    ```
*   **Observation 2 (Untrimmed URL Input)**: In `src/components/ImportModal.tsx` line 33, the raw `url` state is passed directly to the `onImport` function:
    ```typescript
    await onImport(url);
    ```
*   **Observation 3 (Relative Link Breakage)**: In `src/components/MovieCard.tsx` lines 44–54, the source URL is rendered inside an anchor tag:
    ```html
    <a
      href={movie.sourceUrl}
      target="_blank"
      rel="noreferrer"
      ...
    >
    ```
*   **Observation 4 (Search Filtering)**: In `src/app/page.tsx` line 90–91:
    ```typescript
    const filteredMovies = movies
      .filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    ```
*   **Observation 5 (Rating Sorting)**: In `src/app/page.tsx` line 92–96:
    ```typescript
    const ratingA = parseFloat(a.rating || '0');
    const ratingB = parseFloat(b.rating || '0');
    return ratingB - ratingA;
    ```
*   **Observation 6 (Card Grid Layout)**: In `src/app/page.tsx` line 124:
    ```html
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
    ```
*   **Observation 7 (Hover Overlay on Cards)**: In `src/components/MovieCard.tsx` line 43:
    ```html
    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
    ```
*   **Observation 8 (Font Import Mismatch)**: In `tailwind.config.js` lines 34–45:
    ```javascript
    fontFamily: {
      sans: ['Inter', 'system-ui', ...],
    }
    ```
    However, `src/app/layout.tsx` (lines 1-22) does not load the `'Inter'` typeface from `next/font/google` or any stylesheet, causing it to fall back immediately to system-ui.

---

## 2. Logic Chain
1.  **URL Validation Bypass**:
    *   *Premise*: The validation checks if the string contains `"instagram.com/reel/"` (Observation 1).
    *   *Inference 1*: A malicious string like `https://evil-instagram.com/reel/123` contains `"instagram.com/reel/"` and will pass validation.
    *   *Inference 2*: A URL without a protocol (e.g. `instagram.com/reel/123`) passes validation, but when rendered (Observation 3), it resolves as a relative URL (e.g., `http://localhost:3000/instagram.com/reel/123`), leading to a 404 page.
    *   *Inference 3*: Domains are case-insensitive, but case-sensitive `.includes()` rejects `https://www.INSTAGRAM.com/reel/abc`.
2.  **Search Input Space Sensitivity**:
    *   *Premise*: Search does not trim the query input (Observation 4).
    *   *Inference*: If a user enters `"Inception "` (with a trailing space), it checks `m.title.toLowerCase().includes("inception ")`, which fails to find `"Inception"` (without spaces), returning zero results incorrectly.
3.  **Sort Crash via NaN**:
    *   *Premise*: Movie ratings can be unrated (`"N/A"` or `"NR"`) which returns `NaN` when parsed (Observation 5).
    *   *Inference*: Subtracting `NaN` in a sort function results in `NaN`, which breaks the consistency of JavaScript array sorting and yields unstable lists.
4.  **Responsiveness & Layout Issues**:
    *   *Premise*: Grid columns default to `1` on viewports `< 640px` (Observation 6).
    *   *Inference*: On a wide mobile viewport of `600px`, a movie card stretches to `~568px` width. At a `aspect-[2/3]` ratio, the poster stretches to `~852px` height, filling the entire mobile screen with a single movie poster.
    *   *Premise*: Movie action buttons reside inside an overlay hidden with `opacity-0` and shown via `group-hover:opacity-100` (Observation 7).
    *   *Inference*: On touch devices (which lack cursor hover), users cannot reliably reveal or click the delete/link action buttons.

---

## 3. Caveats
*   Verification was conducted strictly via static code analysis. Local development servers and Vitest E2E tests could not be run locally due to Windows shell permission prompt timeouts.
*   Database models and backend pipeline services (M2/M3) were not evaluated under this subtask's scope.

---

## 4. Conclusion
The M1 UI/UX Foundation suffers from 8 core vulnerabilities/gaps (detailed in `challenge.md`), most notably:
1.  **Security/UX URL loopholes**: Allows malicious URL bypasses and breaks routing with protocol-less relative URLs.
2.  **Mobile accessibility issues**: Action buttons are hidden under hover states that do not work on touch screens, and grid cards stretch excessively on wide mobile views.
3.  **Filtering/sorting glitches**: Unstable sorting from `NaN` ratings and search failures from untrimmed trailing spaces.

---

## 5. Verification Method
1.  **Inspect Files**:
    *   `src/components/ImportModal.tsx`
    *   `src/components/MovieCard.tsx`
    *   `src/app/page.tsx`
2.  **Manual Test Inputs**:
    *   Input: `https://evil-instagram.com/reel/abc` (should be rejected but is accepted).
    *   Input: `instagram.com/reel/abc` (should be normalized to `https://...` but is accepted as relative).
    *   Input: `https://www.INSTAGRAM.com/reel/abc` (should be accepted but is rejected).
    *   Search: `"Inception "` (should return Inception but returns nothing).
