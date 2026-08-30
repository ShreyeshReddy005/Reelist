'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Check, X, Film, Star } from 'lucide-react';
import Image from 'next/image';

import { auth } from '@/lib/firebase/config';
import { getWatchlistFromFirestore, addMovieToFirestore } from '@/lib/firebase/firestore';

interface ExtractionSplashProps {
  initialUrl: string;
  onComplete: () => void;
}

const steps = [
  "Looking at the link...",
  "Extracting content...",
  "Analyzing with AI...",
  "Identifying movie names...",
  "Getting related info...",
  "Preparing curation list...",
  "Bypassing IG servers (this takes ~30s)..."
];

export default function ExtractionSplash({ initialUrl, onComplete }: ExtractionSplashProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<'processing' | 'done' | 'error' | 'saved'>('processing');
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedMovies, setExtractedMovies] = useState<any[]>([]);
  const [selectedMovieIds, setSelectedMovieIds] = useState<Set<string>>(new Set());
  const [manualTitle, setManualTitle] = useState('');
  const [deepExtractAvailable, setDeepExtractAvailable] = useState(false);

  const performExtraction = async (target: string, runId?: string, forceDeepExtract = false) => {
    if (!runId && !forceDeepExtract) {
      setStatus('processing');
      setStepIndex(0);
      setErrorMsg('');
      setDeepExtractAvailable(false);
    } else if (forceDeepExtract) {
      setStatus('processing');
      setStepIndex(steps.length - 1); // Jump to the 30s Apify step
      setErrorMsg('');
      setDeepExtractAvailable(false);
    }
    
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runId ? { runId } : { url: target, forceDeepExtract }),
      });

      if (response.status === 202) {
        const data = await response.json();
        if (data.status === 'polling' && data.runId) {
          // It's polling!
          setStepIndex(steps.length - 1); // Set to the 30s bypass step
          setTimeout(() => {
            performExtraction(target, data.runId);
          }, 3000);
          return;
        }
      }

      if (!response.ok) {
        let errorMsg = 'Failed to extract movie';
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
          if (errData.meta?.deepExtractAvailable) setDeepExtractAvailable(true);
        } catch(e) {}
        throw new Error(errorMsg);
      }

      const isDeepExtractAvailable = response.headers.get('Deep-Extract-Available') === 'true';
      setDeepExtractAvailable(isDeepExtractAvailable);
      
      let cloudWatchlist: any[] = [];
      if (auth.currentUser) cloudWatchlist = await getWatchlistFromFirestore(auth.currentUser.uid);

      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let rawText = '';
        let seenTitles = new Set<string>();
        
        setStatus('done');
        setExtractedMovies([]);
        
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const json = JSON.parse(line.replace('data: ', ''));
                if (json.candidates?.[0]?.content?.parts?.[0]?.text) {
                  rawText += json.candidates[0].content.parts[0].text;
                  
                  const matches = Array.from(rawText.matchAll(/"title"\s*:\s*"([^"]+)"/gi));
                  const currentTitles = matches.map(m => m[1]);
                  
                  for (const title of currentTitles) {
                    if (!seenTitles.has(title)) {
                      seenTitles.add(title);
                      
                      const exists = cloudWatchlist.some((m: any) => m.title.toLowerCase() === title.toLowerCase());
                      if (exists) continue;

                      const tempId = `temp-${Date.now()}-${title}`;
                      const tempMovie = { id: tempId, title, year: '', isLoading: true };
                      
                      setExtractedMovies(prev => [...prev, tempMovie]);
                      setSelectedMovieIds(prev => new Set(Array.from(prev).concat([tempId])));
                      
                      fetch('/api/enrich', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ movie: { title }, url: target })
                      }).then(res => res.json()).then(enrichedData => {
                        setExtractedMovies(prev => prev.map(m => {
                          if (m.id === tempId) {
                            return {
                              ...m, 
                              ...enrichedData,
                              id: tempId, 
                              addedAt: new Date().toISOString(),
                              watched: false,
                              queue: (enrichedData.imdbRating || enrichedData.tmdbRating || 0) >= 7 ? 'watchlist' : 'review',
                              moods: m.moods?.length ? m.moods : enrichedData.moods,
                              hashtags: m.hashtags?.length ? m.hashtags : enrichedData.hashtags
                            };
                          }
                          return m;
                        }));
                      }).catch(() => {
                         setExtractedMovies(prev => prev.map(m => m.id === tempId ? { ...m, isLoading: false, queue: 'review' } : m));
                      });
                    }
                  }
                }
              } catch (e) {}
            }
          }
        }
        
        try {
          if (!response.headers.get('X-Cache')) {
            const finalJson = JSON.parse(rawText);
            const finalMovies = finalJson.movies || [];
            
            setExtractedMovies(prev => prev.map(m => {
              const match = finalMovies.find((f: any) => f.title.toLowerCase() === m.title.toLowerCase());
              if (match) {
                return { ...m, moods: match.moods, hashtags: match.hashtags, confidence: match.confidence };
              }
              return m;
            }));

            fetch('/api/cache-extraction', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: target, movies: finalMovies }) 
            }).catch(console.error);
          }
        } catch (e) {
          console.warn('Failed to parse final JSON', e);
        }

        if (seenTitles.size === 0) {
           throw new Error('No movies found');
        }
      } else {
        throw new Error('Expected streaming response');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'processing') {
      interval = setInterval(() => {
        setStepIndex((prev) => {
          if (prev < steps.length - 2) return prev + 1;
          return prev;
        });
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  useEffect(() => {
    performExtraction(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFinish = async () => {
    // Save selected movies
    if (auth.currentUser) {
      const toSave = extractedMovies.filter(m => selectedMovieIds.has(m.id));
      for (const movie of toSave) {
        await addMovieToFirestore(auth.currentUser.uid, movie);
      }
      
      // Notifications
      if ('Notification' in window && Notification.permission === 'granted' && toSave.length > 0) {
        const firstMovie = toSave[0];
        const countText = toSave.length > 1 ? ` and ${toSave.length - 1} others` : '';
        new Notification("Reelist", {
          body: `🎬 Saved '${firstMovie.title}'${countText} to your Watchlist.`,
          icon: '/icon-192x192.png'
        });
      }
    }
    
    setStatus('saved');
  };

  const progressPercent = status === 'done' ? 100 : Math.min(15 + (stepIndex / (steps.length - 1)) * 80, 95);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-white/[0.015] blur-[100px] rounded-full pointer-events-none transition-all duration-1000" 
           style={{ opacity: status === 'done' ? 0.05 : 0.02 }} />
      
      {extractedMovies.length > 0 && extractedMovies[0]?.backdropUrl && status === 'done' && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 animate-fadeIn"
          style={{ backgroundImage: `url(\${extractedMovies[0].backdropUrl})`, animationDuration: '2s' }}
        />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-80" />
      
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center px-4 h-full max-h-screen py-12">
        
        {status === 'processing' && (
          <div className="w-full flex flex-col items-center justify-center h-full animate-fadeIn">
            <div className="h-6 overflow-hidden relative w-full mb-6">
              <p key={stepIndex} className="text-white/60 font-medium animate-slideUp text-sm tracking-wide">
                {steps[stepIndex]}
              </p>
            </div>

            <div className="w-full max-w-xs h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all ease-out" 
                style={{ width: `\${progressPercent}%`, transitionDuration: '2s' }}
              />
            </div>
          </div>
        )}

        {status === 'done' && extractedMovies.length > 0 && (
          <div className="w-full h-full flex flex-col animate-slideUp" style={{ animationDuration: '0.8s' }}>
            <div className="mb-6">
              <h2 className="text-3xl font-black text-white tracking-tight mb-2">Curate Watchlist</h2>
              <p className="text-white/50 text-sm font-medium">We extracted {extractedMovies.length} movie{extractedMovies.length !== 1 ? 's' : ''} from the reel.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-2 flex flex-col gap-2 custom-scrollbar">
              {extractedMovies.map(movie => {
                const isSelected = selectedMovieIds.has(movie.id);
                return (
                  <div 
                    key={movie.id}
                    onClick={() => {
                      const next = new Set(selectedMovieIds);
                      if (next.has(movie.id)) next.delete(movie.id);
                      else next.add(movie.id);
                      setSelectedMovieIds(next);
                    }}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border \${isSelected ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                  >
                    <div className="h-16 w-12 rounded-lg bg-white/10 overflow-hidden shrink-0 relative">
                      {movie.isLoading ? (
                        <div className="w-full h-full flex items-center justify-center animate-pulse bg-white/5"><div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" /></div>
                      ) : movie.posterUrl ? (
                        <Image src={movie.posterUrl} alt={movie.title} fill sizes="48px" className={`object-cover transition-opacity \${!isSelected && 'opacity-50 grayscale'}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4 text-white/30" /></div>
                      )}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <h4 className={`font-bold ${isSelected ? 'text-white' : 'text-white/50'}`}>
                        {movie.title} {movie.isLoading ? <span className="text-white/30 animate-pulse text-xs ml-2">Loading details...</span> : movie.year ? `(${movie.year})` : ''}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {!movie.isLoading && (movie.tmdbRating > 0 || movie.imdbRating > 0) && (() => {
                          const highestRating = Math.max(movie.tmdbRating || 0, movie.imdbRating || 0);
                          return (
                            <span className={`text-xs flex items-center gap-1 font-bold ${isSelected ? 'text-amber-400' : 'text-amber-400/50'}`}>
                              <Star className="w-3.5 h-3.5 fill-current" /> {highestRating.toFixed(1)}
                            </span>
                          );
                        })()}
                        {movie.moods && movie.moods.map((mood: string, i: number) => (
                          <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border ${isSelected ? 'border-indigo-500/30 bg-indigo-500/20 text-indigo-200' : 'border-white/10 text-white/30'}`}>
                            {mood}
                          </span>
                        ))}
                        {movie.hashtags && movie.hashtags.map((tag: string, i: number) => (
                          <span key={`tag-${i}`} className={`text-[10px] px-2 py-0.5 rounded-full border ${isSelected ? 'border-fuchsia-500/30 bg-fuchsia-500/20 text-fuchsia-200' : 'border-white/10 text-white/30'}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="shrink-0 mr-2">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors \${isSelected ? 'bg-white border-white' : 'border-white/20'}`}>
                        {isSelected && <Check className="w-4 h-4 text-black" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-4">
               {deepExtractAvailable && (
                 <button 
                   onClick={() => performExtraction(initialUrl, undefined, true)}
                   className="w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold rounded-2xl transition-all active:scale-95 text-sm"
                 >
                   Missing movies? Run Deep Video Analysis
                 </button>
               )}
               
               <button 
                onClick={handleFinish}
                disabled={selectedMovieIds.size === 0}
                className="w-full py-4 bg-white hover:bg-neutral-200 disabled:opacity-50 disabled:bg-white text-black font-black rounded-2xl shadow-xl transition-all active:scale-95"
              >
                Save {selectedMovieIds.size} Movie{selectedMovieIds.size !== 1 ? 's' : ''}
              </button>
              
              <button 
                onClick={() => { try { window.close() } catch(e){} onComplete(); }}
                className="text-white/40 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider"
              >
                Cancel & Return
              </button>
            </div>
          </div>
        )}
        
        {status === 'done' && extractedMovies.length === 0 && (
          <div className="w-full flex flex-col items-center animate-slideUp">
             <div className="h-16 w-16 mb-4 rounded-full bg-white/10 flex items-center justify-center">
               <Check className="h-8 w-8 text-white" />
             </div>
             <h2 className="text-2xl font-bold text-white mb-2">Already Saved!</h2>
             <p className="text-white/50 text-sm mb-8 text-center max-w-[250px]">
               The movies in this reel are already in your watchlist.
             </p>
             <button 
                onClick={() => { try { window.close() } catch(e){} onComplete(); }}
                className="px-8 py-3 bg-white text-black font-bold rounded-xl active:scale-95 transition-transform"
              >
                Return to App
              </button>
          </div>
        )}

        {status === 'error' && (
          <div className="w-full flex flex-col items-center animate-fadeIn justify-center h-full">
            <div className="h-12 w-12 mb-4 flex items-center justify-center bg-white/[0.03] border border-white/10 rounded-2xl">
              <span className="text-2xl">🚧</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mb-2 text-center">
              Extraction Failed
            </h2>
            <p className="text-white/50 text-xs mb-6 max-w-[280px] leading-relaxed text-center">
              {errorMsg.includes('No movies found') 
                ? 'We could not automatically detect any movie names in this reel. Please enter the movie name manually below.'
                : errorMsg}
            </p>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (manualTitle.trim()) {
                  performExtraction(manualTitle.trim());
                }
              }}
              className="w-full max-w-xs flex flex-col gap-3 mb-6"
            >
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Movie or TV Show name..."
                autoFocus
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.08] transition-all"
              />
              <button 
                type="submit"
                disabled={!manualTitle.trim()}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-black font-bold rounded-xl py-3 text-sm transition-all"
              >
                Find & Add Movie
              </button>
            </form>

            {deepExtractAvailable && (
              <button 
                type="button"
                onClick={() => performExtraction(initialUrl, undefined, true)}
                className="w-full max-w-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold rounded-xl py-3 text-sm transition-all mb-6"
              >
                Scan Video with Deep Extract
              </button>
            )}

            <button 
              onClick={onComplete}
              className="text-white/40 hover:text-white transition-colors text-xs font-semibold"
            >
              Cancel and go back
            </button>
          </div>
        )}

        {status === 'saved' && (
          <div className="w-full flex flex-col items-center animate-slideUp">
             <div className="h-16 w-16 mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
               <Check className="h-8 w-8 text-emerald-400" />
             </div>
             <h2 className="text-2xl font-bold text-white mb-2 text-center">Successfully Saved!</h2>
             <p className="text-white/50 text-sm mb-10 text-center max-w-[250px]">
               The selected movies have been added to your watchlist.
             </p>
             
             <div className="w-full flex flex-col gap-4">
               <button 
                  onClick={() => onComplete()}
                  className="w-full py-4 bg-white hover:bg-neutral-200 text-black font-black rounded-2xl shadow-[0_8px_30px_rgba(255,255,255,0.2)] transition-all active:scale-95 text-sm uppercase tracking-wider"
                >
                  Continue in App
                </button>
                <button 
                  onClick={() => { try { window.close() } catch(e){} onComplete(); }}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all active:scale-95 border border-white/10 text-sm"
                >
                  Close / Return to Instagram
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
