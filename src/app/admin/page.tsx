'use client';

import React, { useEffect, useState } from 'react';
import { getBugReports, BugReport } from '@/lib/firebase/firestore';
import { Bug, ExternalLink, Clock, User, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminBugsPage() {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBugs() {
      try {
        const data = await getBugReports();
        setBugs(data);
      } catch (err) {
        console.error('Failed to load bugs', err);
      } finally {
        setLoading(false);
      }
    }
    loadBugs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <Bug className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Bug Reports</h1>
            <p className="text-white/50 text-sm">System diagnostic dashboard</p>
          </div>
        </div>

        {bugs.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white/80">No bugs reported yet</h2>
            <p className="text-white/40">Your system is running flawlessly.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {bugs.map((bug) => (
              <div key={bug.id} className="bg-black/40 border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      bug.type === 'Extraction Failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      bug.type === 'UI Bug' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      bug.type === 'Feature Request' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                      'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                    }`}>
                      {bug.type}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-white/40">
                      <Clock className="w-3 h-3" />
                      {new Date(bug.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-white/40 bg-white/5 px-2 py-1 rounded-md">
                    <User className="w-3 h-3" />
                    {bug.userId === 'anonymous' ? 'Anonymous' : bug.userId}
                  </span>
                </div>
                
                <p className="text-white/90 text-sm mb-4 leading-relaxed bg-black/40 p-4 rounded-lg border border-white/5">
                  {bug.description}
                </p>

                {bug.url && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Target URL:</span>
                    <a 
                      href={bug.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {bug.url}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
