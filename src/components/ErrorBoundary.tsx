'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-16">
          <div className="h-14 w-14 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 text-center">Something went wrong</h2>
          <p className="text-white/40 text-sm mb-8 text-center max-w-md leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button onClick={this.handleReset} className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold text-sm transition-all active:scale-95">
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="h-16 w-16 mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Something broke</h1>
        <p className="text-white/40 text-sm mb-8 text-center max-w-sm">Refreshing the page should fix things.</p>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-neutral-200 text-black font-bold rounded-2xl transition-all active:scale-95">
          <RefreshCw className="h-4 w-4" /> Reload App
        </button>
      </div>
    }>
      {children}
    </ErrorBoundary>
  );
}
