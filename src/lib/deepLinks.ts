export function getDeepLink(providerName: string, movieTitle: string): string | null {
  const encodedTitle = encodeURIComponent(movieTitle);
  const name = providerName.toLowerCase();

  if (name.includes('netflix')) {
    return `https://www.netflix.com/search?q=${encodedTitle}`;
  }
  if (name.includes('amazon') || name.includes('prime')) {
    return `https://app.primevideo.com/search?searchTerm=${encodedTitle}`;
  }
  if (name.includes('hulu')) {
    return `https://www.hulu.com/search?q=${encodedTitle}`;
  }
  if (name.includes('disney')) {
    return `https://www.disneyplus.com/search?q=${encodedTitle}`;
  }
  if (name.includes('max') || name.includes('hbo')) {
    return `https://play.max.com/search?q=${encodedTitle}`;
  }
  if (name.includes('apple')) {
    return `https://tv.apple.com/us/search?q=${encodedTitle}`;
  }
  if (name.includes('peacock')) {
    return `https://www.peacocktv.com/search?q=${encodedTitle}`;
  }
  if (name.includes('paramount')) {
    return `https://www.paramountplus.com/search/?q=${encodedTitle}`;
  }
  if (name.includes('hotstar')) {
    return `https://www.hotstar.com/in/explore?searchQuery=${encodedTitle}`;
  }
  if (name.includes('jiocinema') || name.includes('jio')) {
    return `https://www.jiocinema.com/search?q=${encodedTitle}`;
  }
  if (name.includes('sony') || name.includes('liv')) {
    return `https://www.sonyliv.com/search?q=${encodedTitle}`;
  }
  if (name.includes('zee5')) {
    return `https://www.zee5.com/search?q=${encodedTitle}`;
  }
  if (name.includes('crunchyroll')) {
    return `https://www.crunchyroll.com/search?q=${encodedTitle}`;
  }
  if (name.includes('youtube')) {
    return `https://www.youtube.com/results?search_query=${encodedTitle}+movie`;
  }
  if (name.includes('google play') || name.includes('google')) {
    return `https://play.google.com/store/search?q=${encodedTitle}&c=movies`;
  }
  if (name.includes('vudu')) {
    return `https://www.vudu.com/content/movies/search?minVisible=0&returnUrl=%2F&searchString=${encodedTitle}`;
  }

  // Fallback: return null if we don't have a known deep link pattern
  return null;
}
