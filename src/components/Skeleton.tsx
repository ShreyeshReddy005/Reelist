'use client';

import React from 'react';

// ── Skeleton Primitives ──────────────────────────────────────────────────────

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton rounded-lg ${className}`} />
  );
}

export function SkeletonText({ width = '100%', className = '' }: { width?: string; className?: string }) {
  return (
    <div className={`skeleton h-3 rounded-full ${className}`} style={{ width }} />
  );
}

// ── Skeleton Card (Movie Poster Placeholder) ─────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="animate-fadeIn" style={{ animationDuration: '0.4s' }}>
      <div className="aspect-[2/3] rounded-2xl skeleton mb-3" />
      <SkeletonText width="75%" className="mb-2" />
      <SkeletonText width="40%" className="h-2" />
    </div>
  );
}

// ── Skeleton Grid (Full Movie Grid Placeholder) ──────────────────────────────

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 50}ms` }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

// ── Skeleton Hero (Hero Section Placeholder) ─────────────────────────────────

export function SkeletonHero() {
  return (
    <div className="relative w-full min-h-[90vh] flex flex-col justify-end pb-12 sm:pb-24 pt-[35vh]">
      <div className="absolute inset-0 skeleton opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center sm:items-start">
        <SkeletonText width="140px" className="mb-4 h-3" />
        <SkeletonBlock className="h-10 sm:h-16 w-[280px] sm:w-[500px] rounded-xl mb-4" />
        <div className="flex gap-3 mb-8">
          <SkeletonText width="50px" className="h-3" />
          <SkeletonText width="40px" className="h-3" />
          <SkeletonText width="80px" className="h-3" />
        </div>
        <SkeletonBlock className="h-16 w-full max-w-2xl rounded-2xl" />
      </div>
    </div>
  );
}
