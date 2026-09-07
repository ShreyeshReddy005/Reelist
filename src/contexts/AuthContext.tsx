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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  loginWithGoogle: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Process redirect result if any
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        setUser(result.user);
      }
    }).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    window.location.href = '/login';
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
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
    <AuthContext.Provider value={{ user, loading, logout, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

