'use client';

import React, { useEffect, useState } from 'react';
import { X, Zap, CheckCircle } from 'lucide-react';

interface IosSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IosSetupModal({ isOpen, onClose }: IosSetupModalProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!isOpen) return null;

  const shortcutUrl = `${origin}/?url=`;

  const copyUrl = () => {
    navigator.clipboard.writeText(shortcutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-[#0a0a0a]/95 backdrop-blur-2xl border-t sm:border border-[#171717] rounded-t-3xl sm:rounded-3xl animate-slideUp sm:animate-scaleIn overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-slate-500 hover:text-white transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Apple-esque Header */}
        <div className="p-8 text-center bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/[0.05]">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-600 p-[1px] mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <div className="w-full h-full rounded-2xl bg-[#0a0a0a] flex items-center justify-center">
              <Zap className="h-7 w-7 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Native iOS Sharing</h2>
          <p className="text-slate-400 text-sm">Add Reelist Elite directly to your iPhone&apos;s Share Sheet in 60 seconds.</p>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">1</div>
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">Create the Shortcut</h3>
              <p className="text-slate-400 text-sm">Open the Shortcuts App, tap the <span className="text-blue-400 font-bold">+</span> on top. Tap the name at the top center, rename it to &quot;Reelist&quot;, and go back to the main grid.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">2</div>
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">Enable Share Sheet</h3>
              <p className="text-slate-400 text-sm">From the grid, <strong>tap and hold (long press)</strong> the Reelist box you just made. Select <strong>Details</strong>, and turn on <strong className="text-white">Show in Share Sheet</strong>.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">3</div>
            <div className="w-full">
              <h3 className="text-white font-semibold text-sm mb-1">Add the URL action</h3>
              <p className="text-slate-400 text-sm mb-3">Go back into the editor (tap the <strong className="text-white">...</strong>). Add the &quot;URL&quot; action block. Paste the URL below, and insert the <strong className="text-white">Shortcut Input</strong> variable right after the = sign.</p>
              
              <div className="flex items-center gap-2 bg-black border border-[#262626] rounded-xl p-2 w-full mb-4">
                <code className="text-xs text-blue-300 truncate flex-1 pl-2">{shortcutUrl}</code>
                <button 
                  onClick={copyUrl}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {copied ? <CheckCircle className="h-3.5 w-3.5" /> : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">4</div>
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">Add the Open URLs action</h3>
              <p className="text-slate-400 text-sm">Finally, search for and add the &quot;Open URLs&quot; action block. It will automatically connect to your URL. Tap Done and you&apos;re finished!</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-black/40 border-t border-[#171717]">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white hover:bg-neutral-200 text-black font-semibold text-sm rounded-xl transition-all active:scale-[0.98]"
          >
            I&apos;ve Set It Up
          </button>
        </div>
      </div>
    </div>
  );
}
