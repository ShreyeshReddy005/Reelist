# Handoff Report — UI/UX Challenger 1

## 1. Observation
We performed a static review of the M1 UI/UX foundation code and observed the following:

- **Case-Sensitive URL Validation**: In `src/components/ImportModal.tsx`, lines 26–29:
  ```typescript
  if (!url.includes('instagram.com/reel/')) {
    setError('Must be a valid Instagram Reel URL (e.g. instagram.com/reel/...)');
    return;
  }
  ```
- **Lack of Domain/Path Isolation**: The above check in `ImportModal.tsx` performs an `.includes()` lookup anywhere in the input string.
- **Hover Dependency for Actions**: In `src/components/MovieCard.tsx`, lines 42–43:
  ```typescript
  {/* Action Overlay */}
  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
  ```
- **Single-Column Mobile Grid**: In `src/app/page.tsx`, line 124:
  ```typescript
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
  ```
- **No Modal Height Control/Scroll**: In `src/components/ImportModal.tsx`, lines 44–49:
  ```typescript
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
    
    {/* Dialog Content */}
    <div className="relative w-full max-w-md bg-background-card border border-border p-6 rounded-lg shadow-2xl z-10">
  ```
- **Rating Sorting Numeric Subtraction**: In `src/app/page.tsx`, lines 92–97:
  ```typescript
  .sort((a, b) => {
    if (sortBy === 'rating') {
      const ratingA = parseFloat(a.rating || '0');
      const ratingB = parseFloat(b.rating || '0');
      return ratingB - ratingA;
  ```

---

## 2. Logic Chain
- **Case Sensitivity**: Because `url.includes('instagram.com/reel/')` is case-sensitive, any browser URL copy-paste action that results in uppercase/mixed-case domain names (e.g., `INSTAGRAM.COM`) or paths (e.g., `/REEL/`) will fail this verification, even though they represent perfectly valid Reel links.
- **Spoofing/Phishing**: Because `url.includes` matches any substring, entering a URL like `https://fakeinstagram.com/reel/` or `https://malicious.com/?redirect=https://instagram.com/reel/` will evaluate to `true`. This permits bypass of validation, which could result in SSRF, downstream parser crashes, or phishing links rendered directly in the user interface.
- **Hover dependency**: Touchscreen viewports (coarse pointer devices like mobile/tablets) do not fire standard mouse hover states reliably. Because the action overlay (`Delete` and `View Reel`) requires `group-hover:opacity-100` and starts with `opacity-0`, these controls are physically inaccessible on touch screens.
- **Oversized mobile grid**: Below the `sm` (640px) breakpoint, `grid-cols-1` is applied. With ~16px padding on either side, a viewport of 480px results in a card width of 448px. A `2:3` aspect ratio means a poster height of ~672px. Adding card text, the card height exceeds typical viewport heights, causing poor scrolling UX.
- **Modal clipping**: The modal container has a fixed layout content structure but no `max-h-full` or `overflow-y-auto` style. When rendered in low-height viewports (e.g., landscape mobile devices or with active soft-keyboards), the modal is clipped and cannot be scrolled, cutting off cancel/import buttons.
- **Unstable sorting**: If a movie rating is missing or non-numeric (such as `'N/A'`), `parseFloat('N/A')` returns `NaN`. `ratingB - NaN` evaluates to `NaN`. Comparator functions returning `NaN` in JavaScript result in unstable sorting behavior where ordering is browser-dependent.

---

## 3. Caveats
- Since running local servers/terminal commands (`npm test`) was blocked by timed-out permission prompts, we were not able to run live Cypress/Playwright or vitest tests. All findings are derived through static analysis of the source code layouts and JS/TS control flows.
- We did not evaluate the database or pipeline components (M2/M3) as they are outside of the current UI/UX foundation scope.

---

## 4. Conclusion
The M1 UI/UX Foundation has several critical/high-severity gaps in layout responsiveness and input state validation:
1. **Validation bugs**: Case sensitivity and domain spoofing bypasses in `ImportModal.tsx`.
2. **Accessibility issues**: Hover-dependent action overlays in `MovieCard.tsx` break touch interactions.
3. **Mobile Layout bugs**: Giant movie cards on mobile portrait/landscape screens and clipping in the `ImportModal` on short-height screens.
4. **Sorting instability**: `NaN` subtraction in movie rating sorting when metadata is missing or non-numeric.

These gaps should be resolved before the UI is integrated with the scraper pipeline in Milestone 4.

---

## 5. Verification Method
1. **URL Validation Verification**:
   - Inspect `src/components/ImportModal.tsx`. Try checking the behavior of the validation check in a JS console using:
     ```javascript
     const val = (url) => url.includes('instagram.com/reel/');
     console.log(val('https://www.INSTAGRAM.com/reel/123/')); // Output: false (Valid URL fails)
     console.log(val('https://attacker.com/instagram.com/reel/')); // Output: true (Spoof URL passes)
     ```
2. **Hover Overlay Verification**:
   - Inspect `src/components/MovieCard.tsx`. Observe the dependency on `group-hover:opacity-100`. Emulate a mobile device in Chrome DevTools (using touch events/mobile profile) and verify that hovering is not possible and buttons are hidden.
3. **Grid Breakpoints Verification**:
   - Inspect `src/app/page.tsx`. Observe the grid columns configuration. Resize the browser viewport below 640px and verify that movie cards span the full viewport width.
