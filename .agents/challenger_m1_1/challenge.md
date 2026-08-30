# Challenge Report — UI/UX Foundation (M1)

## Challenge Summary

**Overall risk assessment**: HIGH

Through adversarial static analysis of the M1 UI/UX foundation implementation, we identified several critical design flaws and functional bugs. These include weak input validation that permits phishing/malicious URLs, case-sensitivity issues that reject valid URLs, mobile UI inaccessibility for deleting and viewing imported movies due to hover overlay dependencies, sub-optimal mobile layouts resulting in massive cards, modal viewport clipping, and unstable list sorting behavior under edge-case data.

---

## Challenges

### [High] Challenge 1: Case-Sensitive URL Validation Bug
- **Assumption challenged**: The validation logic assumes that user inputs will always conform strictly to lowercase characters for URL protocols, domains, and paths.
- **Attack scenario**: A user copies an Instagram Reel URL that has uppercase/mixed-case segments, e.g., `https://www.INSTAGRAM.com/reel/C8aBcDeFgHi/` or `https://www.instagram.com/REEL/C8aBcDeFgHi/`.
- **Blast radius**: The modal's validation check `!url.includes('instagram.com/reel/')` evaluates to `true` (since it is case-sensitive), throwing an validation error: `"Must be a valid Instagram Reel URL..."`. Valid user inputs will be rejected unnecessarily, leading to user frustration.
- **Mitigation**: Convert the input URL to lowercase (or at least the domain/path prefix portion) or use a case-insensitive regular expression before validation. E.g., `const cleanUrl = url.toLowerCase();` or `const isReelUrl = /^https?:\/\/(www\.)?instagram\.com\/reel\//i.test(url);`.

### [High] Challenge 2: Phishing & Domain Spoofing Vulnerability in URL Validation
- **Assumption challenged**: The validation assumes that any string containing the substring `instagram.com/reel/` is a genuine Instagram Reel URL.
- **Attack scenario**: A malicious site link or redirect is entered, e.g., `https://malicious-phishing-site.com/?redirect=https://instagram.com/reel/abc/` or `https://instagram.com.attacker.com/reel/abc/`.
- **Blast radius**: These URLs contain the substring `instagram.com/reel/` and therefore pass the validation. They will proceed to `onImport(url)`. If the backend scraper does not have highly robust domain checks, it might attempt to fetch from or query these domains, exposing the backend to SSRF (Server-Side Request Forgery) or allowing arbitrary script execution/malicious data ingestion. If displayed directly in the UI as the source link, users could click it and be redirected to a phishing site.
- **Mitigation**: Implement a strict URL parsing and domain verification logic using `new URL(url)` and verifying that the host is exactly `instagram.com` or `www.instagram.com`, and the pathname starts with `/reel/`.

### [High] Challenge 3: Inaccessibility of MovieCard Actions on Mobile Viewports (Hover Dependence)
- **Assumption challenged**: The UI assumes that the watchlist dashboard will only be accessed from devices that support hover interactions (e.g. desktop with mouse pointers).
- **Attack scenario**: A user accesses the watchlist from a mobile phone or tablet screen. They want to click the "View original Instagram Reel" link or the "Delete from Watchlist" button.
- **Blast radius**: The action overlay is styled with `absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity`. On touch devices, there is no active hover state. The overlay remains at `opacity-0` (or triggers unpredictably and gets stuck on a tap). Consequently, mobile users cannot delete movies or click the external Reel source links.
- **Mitigation**: For touch viewports (detected via `@media (hover: none)` or JS check), keep the action buttons permanently visible under the movie poster, or add a visible dropdown/kebab menu (`...`) on the card that works on click.

### [Medium] Challenge 4: Oversized Movie Cards on Mobile Viewports
- **Assumption challenged**: The layout assumes that a single column is appropriate for all viewports below the `sm` (640px) breakpoint.
- **Attack scenario**: A user views the dashboard on a standard mobile device (e.g. 480px width).
- **Blast radius**: The movie grid is configured as `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`. Below 640px, the grid collapses to 1 column. In a 480px viewport, with 32px of page padding, a single card spans ~448px width. Because of the `aspect-[2/3]` poster constraints, the height of the poster becomes ~672px. Including card content, the card occupies over 736px of vertical height. This is taller than most mobile screens, forcing the user to scroll repeatedly to see even a single movie card and its actions.
- **Mitigation**: Adjust the grid breakpoints to use `grid-cols-2` at viewports starting from ~350px (e.g. `grid-cols-2 sm:grid-cols-2 md:grid-cols-3...`) or use CSS grid `auto-fill` with a minmax boundary like `grid-cols-[repeat(auto-fill,minmax(140px,1fr))]`.

### [Medium] Challenge 5: Import Modal Viewport Clipping on Small-Height Viewports
- **Assumption challenged**: The modal assumes that the device viewport will always have sufficient height to display the entire dialog contents.
- **Attack scenario**: A user opens the import modal on a mobile device in landscape mode, or with an on-screen keyboard active.
- **Blast radius**: The modal has a fixed vertical height of roughly 280px. If the viewport height is less than 300px, the modal will overflow. Because the modal's container has `relative w-full max-w-md` but lacks any `max-h-full` or `overflow-y-auto` styles, the top and bottom contents (such as the Close button or the Import button) will be clipped and inaccessible.
- **Mitigation**: Add `max-h-[calc(100vh-2rem)]` and `overflow-y-auto` to the modal container `div` so that it handles small viewports gracefully.

### [Medium] Challenge 6: Unstable Sorting by Rating (NaN Handling)
- **Assumption challenged**: The sorting logic assumes that movie ratings will always be valid float-parseable strings.
- **Attack scenario**: A movie is imported with a rating of `"N/A"` (standard for unrated/missing items from OMDB) or an empty string.
- **Blast radius**: In `page.tsx`, sorting by rating is implemented as:
  ```typescript
  const ratingA = parseFloat(a.rating || '0');
  const ratingB = parseFloat(b.rating || '0');
  return ratingB - ratingA;
  ```
  If `a.rating` is `"N/A"`, `parseFloat(a.rating)` evaluates to `NaN`. Subtracting `NaN` (`ratingB - NaN`) returns `NaN`. When a sorting comparator returns `NaN` in JavaScript, the sort order becomes unstable and browser-dependent, resulting in erratic item orderings.
- **Mitigation**: Sanitize the rating calculation to return a fallback number (e.g. `0`) if the parsed value is `NaN`.
  ```typescript
  const parseRating = (r?: string) => {
    const val = parseFloat(r || '0');
    return isNaN(val) ? 0 : val;
  };
  ```

### [Low] Challenge 7: Untestable Inline Event Handlers and Helpers
- **Assumption challenged**: Embedding all logic within React components does not impact quality validation.
- **Attack scenario**: A developer wants to run fast unit tests on the URL validation format or the custom list sorting.
- **Blast radius**: The URL validation logic and the movie filtering/sorting logic are declared inline inside `ImportModal.tsx` and `page.tsx` respectively. They cannot be imported into a unit test without mocking the entire React rendering/DOM context, leading to poor test coverage.
- **Mitigation**: Refactor this logic into separate utility functions under `src/lib/utils/` and export them.

---

## Stress Test Results

### Scenario 1: Case Sensitivity in Import URL
- **Input URL**: `https://www.INSTAGRAM.com/reel/C8aBcDeFgHi/`
- **Expected Behavior**: Successfully parses domain, shows "Extracting..." state, and completes import.
- **Actual/Predicted Behavior**: **FAIL**. Triggers UI validation error "Must be a valid Instagram Reel URL" because `.includes('instagram.com/reel/')` is case-sensitive.

### Scenario 2: Domain Spoofing Bypass
- **Input URL**: `https://notinstagram.com/reel/C8aBcDeFgHi/`
- **Expected Behavior**: Rejected by URL validation as not a genuine Instagram domain.
- **Actual/Predicted Behavior**: **FAIL**. Passes verification because it contains the substring `'instagram.com/reel/'`.

### Scenario 3: Query Param Spoofing
- **Input URL**: `https://phishing.com/attack?redirect=https://instagram.com/reel/C8aBcDeFgHi/`
- **Expected Behavior**: Rejected by URL validation as not a genuine Instagram domain.
- **Actual/Predicted Behavior**: **FAIL**. Passes validation and attempts import of malicious URL.

### Scenario 4: No Reel Identifier
- **Input URL**: `https://www.instagram.com/reel/`
- **Expected Behavior**: Rejected because there is no reel ID to query.
- **Actual/Predicted Behavior**: **FAIL**. Passes validation since it contains the substring, leading to downstream failure.

### Scenario 5: Missing/Non-numeric Rating Sort
- **Watchlist**: Movie A (Rating: `"9.0"`), Movie B (Rating: `"N/A"`), Movie C (Rating: `"8.5"`)
- **Action**: Sort by Rating.
- **Expected Behavior**: Sorted descending: Movie A (`9.0`), Movie C (`8.5`), Movie B (`N/A`).
- **Actual/Predicted Behavior**: **FAIL**. `parseFloat("N/A")` results in `NaN`, leading to unstable sort order where the relative position of Movie B is undefined.

---

## Unchallenged Areas
- **Supabase Integration & SQLite Backend**: Out of scope for Milestone 1 (M1).
- **Scraper pipeline logic details**: Out of scope for M1 (handled by M3).
