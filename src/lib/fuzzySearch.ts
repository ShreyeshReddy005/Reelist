/**
 * A lightweight, highly optimized fuzzy search utility for supersmooth client-side filtering.
 * Uses a sequence matching algorithm to tolerate missing characters (typos) while maintaining speed.
 */
export function fuzzyMatch(pattern: string, str: string): boolean {
  if (!pattern) return true;
  if (!str) return false;

  const normalizedPattern = pattern.toLowerCase().replace(/\s+/g, '');
  const normalizedStr = str.toLowerCase();

  // Fast path: direct substring match
  if (normalizedStr.includes(normalizedPattern)) return true;

  // Fuzzy path: sequence matching (allows missing characters, e.g. "incption" matches "inception")
  let patternIdx = 0;
  let strIdx = 0;

  while (patternIdx < normalizedPattern.length && strIdx < normalizedStr.length) {
    if (normalizedPattern[patternIdx] === normalizedStr[strIdx]) {
      patternIdx++;
    }
    strIdx++;
  }

  return patternIdx === normalizedPattern.length;
}
