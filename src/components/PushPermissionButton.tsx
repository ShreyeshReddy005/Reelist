'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { requestPushPermissionAndSubscribe } from '@/lib/push';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

export default function PushPermissionButton() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      // Check current permission
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });

    return () => unsub();
  }, []);

  const handleSubscribe = async () => {
    if (!userId) {
      alert("Please sign in first.");
      return;
    }
    setIsLoading(true);
    const success = await requestPushPermissionAndSubscribe(userId);
    if (success) {
      setIsSubscribed(true);
    }
    setIsLoading(false);
  };

  if (!isSupported || isSubscribed) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between mt-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Bell className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Enable &ldquo;Crazy&rdquo; Notifications</h3>
          <p className="text-white/60 text-xs mt-0.5">Get roasted daily if you don&apos;t clear your watchlist.</p>
        </div>
      </div>
      <button 
        onClick={handleSubscribe}
        disabled={isLoading}
        className="px-4 py-2 bg-amber-500 text-black font-bold text-sm rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
      </button>
    </div>
  );
}
