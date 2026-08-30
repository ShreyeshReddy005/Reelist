// We rely on Apify for extraction to guarantee robustness.

// ── Types ────────────────────────────────────────────────────────────────────

export interface EmbedResult {
  caption: string;
  videoUrl: string | null;
  imageUrls: string[];
  comments: string[];
  extractionMeta: {
    layers: string[];
    totalTimeMs: number;
  };
  apifyRunId?: string;
}

interface LayerResult {
  caption?: string;
  videoUrl?: string | null;
  imageUrls?: string[];
  comments?: string[];
  shortCode?: string;
  url?: string;
}

// ── Utility ──────────────────────────────────────────────────────────────────

function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/** Fetch with a hard timeout to prevent hanging requests */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// Removed Facebook oEmbed API layer entirely (Option 2).

// ── Layer 2: Comment Extraction (Multi-strategy) ─────────────────────────────
// Tries multiple User-Agents to scrape comments from Instagram's SSR HTML.
// Returns: comments array.

const USER_AGENTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (compatible; DuckDuckBot-Https/1.1; https://duckduckgo.com/duckduckbot)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
];

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&#x27;': "'", '&#x2F;': '/', '&#x60;': '`', '&#x3D;': '=', '&nbsp;': ' ',
  };
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.split(entity).join(char);
  }
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  return decoded;
}

async function layer2_comments(url: string): Promise<LayerResult> {
  // MICRO-PERFECTION: Run all User-Agents in parallel and take the first one that successfully extracts data.
  // This drops scraping time from potentially 10s+ (sequential) to < 1s (fastest wins).
  const promises = USER_AGENTS.map(async (ua) => {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': ua, 'Accept-Language': 'en-US,en;q=0.9' },
    }, 4000); // 4s strict timeout per request

    if (!res.ok) throw new Error('Bad status');

    const html = await res.text();
    const comments: string[] = [];
    
    const commentRegex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*[^}]*?"__typename"\s*:\s*"XIGComment"/g;
    let match;
    while ((match = commentRegex.exec(html)) !== null) {
      let commentText = match[1]
        .replace(/\\u([\dA-Fa-f]{4})/gi, (_, g) => String.fromCharCode(parseInt(g, 16)))
        .replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\\\/g, '\\').trim();
      if (commentText && !comments.includes(commentText) && commentText.length > 2) {
        comments.push(commentText);
      }
    }

    const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i);
    const twDesc = html.match(/<meta[^>]*name="twitter:description"[^>]*content="([^"]*)"/i);
    const metaDesc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i);
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i);
    
    let extractedCaption = '';
    if (ogDesc?.[1]) extractedCaption = decodeHtmlEntities(ogDesc[1]);
    else if (twDesc?.[1]) extractedCaption = decodeHtmlEntities(twDesc[1]);
    else if (metaDesc?.[1]) extractedCaption = decodeHtmlEntities(metaDesc[1]);
    
    let extractedTitle = '';
    if (ogTitle?.[1]) extractedTitle = decodeHtmlEntities(ogTitle[1]).replace(' on Instagram', '');
    
    const caption = (extractedCaption + ' ' + extractedTitle).trim();

    if (comments.length === 0 && caption.length < 5) {
      throw new Error('No useful data extracted');
    }

    return { comments: comments.length > 0 ? comments : undefined, caption: caption || undefined };
  });

  try {
    // Return the FIRST successful extraction instantly
    return await Promise.any(promises);
  } catch (e) {
    return { comments: undefined, caption: undefined };
  }
}

// ── Removed Layer 3 (Obsolete) ────────────────────────────────────────────────

// ── Layer 4: Microlink API (Metadata + Fallback) ─────────────────────────────
// Free-tier API for metadata extraction. 100 req/day limit.
// Returns: caption, videoUrl, imageUrls.

async function layer4_microlink(url: string): Promise<LayerResult> {
  const res = await fetchWithTimeout(
    `https://api.microlink.io?url=${encodeURIComponent(url)}`,
    {},
    4000 // MICRO-PERFECTION: Drop to 4s. We care more about speed, layer2 handles text anyway.
  );

  if (!res.ok) throw new Error(`Microlink returned ${res.status}`);

  const data = await res.json();
  if (!data.data) throw new Error('No data from Microlink');

  const result: LayerResult = {};

  if (data.data.description || data.data.title) {
    result.caption = data.data.description || data.data.title;
  }
  if (data.data.video?.url) {
    result.videoUrl = data.data.video.url;
  }
  if (data.data.image?.url) {
    result.imageUrls = [data.data.image.url];
  }

  return result;
}

// ── Layer 5: Apify Actor (Emergency Fallback) ────────────────────────────────
// Most expensive but most reliable. Only triggered if all above layers fail
// to produce a caption. Uses the existing APIFY_TOKEN.
// Returns: caption, comments, videoUrl.

async function layer5_apify_start(url: string): Promise<string> {
  console.log(`[Apify] Starting extraction run for: ${url}`);
  
  // CRITICAL FIX: Apify's instagram-scraper breaks when it sees "/reel/" in the URL and thinks "reel" is the username.
  // We must normalize it to "/p/" before sending it to the scraper.
  const normalizedUrl = url.replace(/\/reel\//i, '/p/');

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN missing');

  const actorUrl = `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${token}`;
  
  const res = await fetchWithTimeout(actorUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      directUrls: [normalizedUrl],
      resultsLimit: 1
    }),
  }, 10000);

  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) {
      throw new Error(`APIFY_RATE_LIMIT`);
    }
    throw new Error(`Apify start returned ${res.status}: ${txt}`);
  }

  const data = await res.json();
  if (!data.data || !data.data.id) throw new Error('Apify start returned no run ID');

  return data.data.id;
}

export async function checkApifyRun(runId: string): Promise<{ status: string, result?: LayerResult }> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('No APIFY_TOKEN available');

  const runUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`;
  const res = await fetchWithTimeout(runUrl, {}, 10000);
  if (!res.ok) throw new Error(`Apify status returned ${res.status}`);
  
  const runData = await res.json();
  const status = runData.data.status;
  
  if (status === 'SUCCEEDED') {
    const datasetId = runData.data.defaultDatasetId;
    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`;
    const datasetRes = await fetchWithTimeout(datasetUrl, {}, 10000);
    if (!datasetRes.ok) throw new Error(`Apify dataset returned ${datasetRes.status}`);
    
    const items = await datasetRes.json();
    if (!Array.isArray(items) || items.length === 0) {
      return { status: 'SUCCEEDED', result: {} };
    }
    
    const post = items[0];
    const result: LayerResult = {};
    if (post.shortCode) result.shortCode = post.shortCode;
    if (post.url) result.url = post.url;
    if (post.caption) result.caption = post.caption;
    if (post.videoUrl) result.videoUrl = post.videoUrl;
    if (post.childPosts && Array.isArray(post.childPosts) && post.childPosts.length > 0) {
      result.imageUrls = post.childPosts.map((cp: any) => cp.displayUrl).filter(Boolean);
    } else if (post.images && Array.isArray(post.images) && post.images.length > 0) {
      result.imageUrls = post.images;
    } else if (post.displayUrl) {
      result.imageUrls = [post.displayUrl];
    }
    if (post.latestComments && Array.isArray(post.latestComments)) {
      result.comments = post.latestComments
        .map((c: any) => c.text || c.body || '')
        .filter((t: string) => t.length > 2);
    }
    return { status: 'SUCCEEDED', result };
  } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
    return { status: 'FAILED' };
  }
  
  return { status: 'RUNNING' };
}

// ── Master Orchestrator ──────────────────────────────────────────────────────

export async function scrapeInstagramEmbed(url: string, forceDeepExtract: boolean = false): Promise<EmbedResult> {
  const startTime = Date.now();
  
  if (forceDeepExtract) {
    console.log('[instagram] Attempting Apify Deep Extraction...');
    try {
      const runId = await layer5_apify_start(url);
      return { 
        caption: '', 
        videoUrl: null, 
        imageUrls: [], 
        comments: [], 
        apifyRunId: runId, 
        extractionMeta: { layers: ['Apify-Strict'], totalTimeMs: Date.now() - startTime } 
      };
    } catch (e: any) {
      console.warn(`[instagram] Apify Deep Extract failed (${e.message}), falling back to Fast Extraction.`);
      // Circuit breaker: Fall through to Tier 1 instead of crashing the UI
    }
  }

  // Tier 1: Fast Extract (Microlink + SSR)
  console.log('[instagram] Attempting Fast Extraction (Microlink + SSR)...');
  try {
    const [microlinkResult, commentsResult] = await Promise.all([
      layer4_microlink(url).catch(() => ({} as LayerResult)),
      layer2_comments(url).catch(() => ({} as LayerResult))
    ]);
    
    return {
      caption: microlinkResult.caption || commentsResult.caption || '',
      videoUrl: microlinkResult.videoUrl || null,
      imageUrls: microlinkResult.imageUrls || [],
      comments: commentsResult.comments || [],
      extractionMeta: { layers: ['Microlink', 'SSR'], totalTimeMs: Date.now() - startTime }
    };
  } catch (fallbackErr: any) {
    throw new Error(`Fast extraction layers failed: ${fallbackErr.message}`);
  }
}
