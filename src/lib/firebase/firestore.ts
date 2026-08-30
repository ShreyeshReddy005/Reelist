import { db } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy,
  deleteDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { Movie } from '@/types/movie';

export function cleanPayload(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanPayload);
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanPayload(value);
    }
  }
  return cleaned;
}

export async function addMovieToFirestore(userId: string, movie: Movie) {
  if (!userId) throw new Error('User not authenticated');
  
  const movieRef = doc(db, 'users', userId, 'watchlist', movie.id);
  const cleanMovie = cleanPayload(movie);
  await setDoc(movieRef, cleanMovie);
}

export async function getWatchlistFromFirestore(userId: string): Promise<Movie[]> {
  if (!userId) return [];
  
  const watchlistRef = collection(db, 'users', userId, 'watchlist');
  const q = query(watchlistRef, orderBy('addedAt', 'desc'));
  
  const querySnapshot = await getDocs(q);
  const movies: Movie[] = [];
  
  querySnapshot.forEach((doc) => {
    movies.push(doc.data() as Movie);
  });
  
  return movies;
}

export async function updateMovieInFirestore(userId: string, movieId: string, updates: Partial<Movie>) {
  if (!userId) return;
  
  const movieRef = doc(db, 'users', userId, 'watchlist', movieId);
  const cleanUpdates = cleanPayload(updates);
  await updateDoc(movieRef, cleanUpdates);
}

export async function deleteMovieFromFirestore(userId: string, movieId: string) {
  if (!userId) return;
  
  const movieRef = doc(db, 'users', userId, 'watchlist', movieId);
  await deleteDoc(movieRef);
}

export async function savePushSubscription(userId: string, subscription: any) {
  if (!userId || !subscription) return;
  const subRef = doc(db, 'users', userId, 'push_subscriptions', subscription.endpoint.split('/').pop() || Date.now().toString());
  await setDoc(subRef, {
    subscription: cleanPayload(JSON.parse(JSON.stringify(subscription))),
    updatedAt: new Date().toISOString()
  });
}

export async function createShareLink(userId: string, userName: string, photoUrl: string | undefined, movie: Movie): Promise<string> {
  const shareRef = doc(collection(db, 'shares'));
  const shareData = {
    senderId: userId,
    senderName: userName,
    senderAvatar: photoUrl || null,
    movie: cleanPayload(movie),
    createdAt: new Date().toISOString()
  };
  await setDoc(shareRef, shareData);
  return shareRef.id;
}

export async function getShareData(shareId: string): Promise<any> {
  if (!shareId) return null;
  const shareRef = doc(db, 'shares', shareId);
  const shareSnap = await getDoc(shareRef);
  if (shareSnap.exists()) {
    return { id: shareSnap.id, ...shareSnap.data() };
  }
  return null;
}

export async function getCachedExtraction(shortcode: string): Promise<any[] | null> {
  if (!shortcode) return null;
  try {
    const cacheRef = doc(db, 'reelist_extractions', shortcode);
    const snap = await getDoc(cacheRef);
    if (snap.exists()) {
      const data = snap.data();
      return data.movies || null;
    }
  } catch (e) {
    console.warn('[cache] Error reading global cache', e);
  }
  return null;
}

export async function saveCachedExtraction(shortcode: string, movies: any[]) {
  if (!shortcode || !movies || movies.length === 0) return;
  try {
    const cacheRef = doc(db, 'reelist_extractions', shortcode);
    await setDoc(cacheRef, {
      movies: cleanPayload(movies),
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[cache] Error saving to global cache', e);
  }
}

export interface BugReport {
  id?: string;
  type: string;
  description: string;
  url?: string;
  timestamp: string;
  userId?: string;
}

export async function saveBugReport(report: Omit<BugReport, 'timestamp'>) {
  const bugRef = doc(collection(db, 'reelist_bugs'));
  const data: BugReport = {
    ...report,
    id: bugRef.id,
    timestamp: new Date().toISOString()
  };
  await setDoc(bugRef, cleanPayload(data));
  return bugRef.id;
}

export async function getBugReports(): Promise<BugReport[]> {
  const bugsRef = collection(db, 'reelist_bugs');
  const q = query(bugsRef, orderBy('timestamp', 'desc'));
  const querySnapshot = await getDocs(q);
  
  const bugs: BugReport[] = [];
  querySnapshot.forEach((doc) => {
    bugs.push(doc.data() as BugReport);
  });
  
  return bugs;
}
