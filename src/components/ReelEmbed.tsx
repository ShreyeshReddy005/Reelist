'use client';

import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface ReelEmbedProps {
  sourceUrl?: string;
}

function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

function isReel(url: string): boolean {
  return /instagram\.com\/reel\//i.test(url);
}

export default function ReelEmbed({ sourceUrl }: ReelEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!sourceUrl || !sourceUrl.includes('instagram.com')) return null;

  const shortcode = extractShortcode(sourceUrl);
  if (!shortcode) return null;

  const isReelType = isReel(sourceUrl);
  const embedUrl = `https://www.instagram.com/${isReelType ? 'reel' : 'p'}/${shortcode}/embed/`;

  if (error) {
    return (
      <div className="w-full">
        <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-3 flex items-center gap-1.5">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/></svg>
          Discovered on Instagram
        </p>
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white text-sm font-medium transition-all">
          <ExternalLink className="h-4 w-4" /> Open in Instagram
        </a>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-3 flex items-center gap-1.5">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/></svg>
        Discovered on Instagram
      </p>
      <div className={`relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black ${isReelType ? 'aspect-[9/16] max-w-[350px]' : 'aspect-square max-w-[400px]'}`}>
        {!loaded && (
          <div className="absolute inset-0 skeleton flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 text-white/30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/></svg>
            </div>
          </div>
        )}
        <iframe src={embedUrl} className={`w-full h-full border-0 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          allowFullScreen loading="lazy" onLoad={() => setLoaded(true)} onError={() => setError(true)}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" />
      </div>
    </div>
  );
}
