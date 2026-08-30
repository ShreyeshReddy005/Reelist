'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  createSession: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  loginWithGoogle: async () => {},
  createSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const createSession = async (currentUser: User) => {
    const idToken = await currentUser.getIdToken();
    await fetch('/api/login', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
  };

  useEffect(() => {
    // Process redirect result
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        await createSession(result.user);
      }
    }).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure session cookie exists when auth state changes (e.g. from redirect or reload)
        await createSession(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    await fetch('/api/logout');
    setUser(null);
    window.location.href = '/login';
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await createSession(result.user);
      setUser(result.user);
      window.location.href = '/';
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider);
      } else {
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, loginWithGoogle, createSession }}>
      {children}
    </AuthContext.Provider>
  );
}
