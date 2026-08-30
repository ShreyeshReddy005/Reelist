'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Film, Plus } from 'lucide-react';

interface BottomNavProps {
  onImportClick: () => void;
}

export default function BottomNav({ onImportClick }: BottomNavProps) {
  const pathname = usePathname();

  const tabs = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/watchlist', icon: Film, label: 'Watchlist' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Glassmorphic background */}
      <div className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-2xl border-t border-white/[0.06]" />
      
      <div className="relative flex items-center justify-around px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${
                isActive
                  ? 'text-amber-500'
                  : 'text-white/40 hover:text-white/60 active:scale-95'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]' : ''}`} />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}
        
        {/* Import CTA — center elevated button */}
        <button
          onClick={onImportClick}
          className="flex flex-col items-center gap-1 py-1.5 px-4 text-white/40 hover:text-white/60 active:scale-95 transition-all"
        >
          <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Plus className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Import</span>
        </button>
      </div>
    </nav>
  );
}
