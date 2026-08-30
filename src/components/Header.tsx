'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bug, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onOpenBugReport: () => void;
}

export default function Header({ onOpenBugReport }: HeaderProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/watchlist', label: 'Watchlist' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="text-xl font-bold tracking-[-0.03em] text-white">
              Reelist
            </span>
            <span className="text-xl font-bold tracking-[-0.03em] text-amber-500">
              .
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}

          {/* Bug Report Button */}
          <button
            onClick={onOpenBugReport}
            className="
              group flex items-center gap-2
              bg-white/5 hover:bg-white/10 border border-white/10
              text-white/80 font-semibold
              px-4 py-2 rounded-lg text-sm
              transition-all duration-150
              active:scale-[0.97]
            "
          >
            <Bug className="h-4 w-4 text-red-400 group-hover:text-red-300 transition-colors" />
            <span className="hidden sm:inline">Report Bug</span>
          </button>
        </div>
      </div>
    </header>
  );
}
