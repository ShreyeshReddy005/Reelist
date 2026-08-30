import { Metadata } from 'next';
import { getShareData } from '@/lib/firebase/firestore';
import { notFound } from 'next/navigation';
import AddFromShareButton from '@/components/AddFromShareButton';
import { Star, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Props {
  params: {
    shareId: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getShareData(params.shareId);
  
  if (!data) {
    return {
      title: 'Shared Movie not found | Reelist Elite',
    };
  }

  const { senderName, movie } = data;
  const title = `${senderName} recommended ${movie.title} | Reelist Elite`;
  const description = `Check out ${movie.title} on Reelist Elite! Tap to instantly add this recommendation to your watchlist.`;
  const image = movie.backdropUrl || movie.posterUrl || 'https://reelist.netlify.app/og-default.jpg';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reelist.netlify.app/share/${params.shareId}`,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: movie.title,
        },
      ],
      siteName: 'Reelist Elite',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const data = await getShareData(params.shareId);

  if (!data) {
    notFound();
  }

  const { senderName, senderAvatar, movie } = data;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl transform scale-110"
          style={{ backgroundImage: `url(${movie.backdropUrl || movie.posterUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="z-10 w-full max-w-4xl relative">
        
        {/* Header Attribution */}
        <div className="flex flex-col items-center justify-center mb-10 text-center animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            {senderAvatar ? (
              <Image src={senderAvatar} alt={senderName} width={48} height={48} unoptimized className="w-12 h-12 rounded-full border-2 border-primary shadow-[0_0_15px_rgba(255,0,128,0.5)]" />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center bg-primary/20 text-primary font-bold text-xl shadow-[0_0_15px_rgba(255,0,128,0.5)]">
                {senderName.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
              {senderName} thinks you&apos;ll love this!
            </h1>
          </div>
          <p className="text-white/60 text-lg">Add this recommendation to your Reelist Elite watchlist instantly.</p>
        </div>

        {/* Movie Showcase Card */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row gap-8 items-center md:items-start animate-scale-in">
          <div className="w-48 md:w-64 flex-shrink-0">
            <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
              <Image 
                src={movie.posterUrl} 
                alt={movie.title} 
                fill
                sizes="(max-width: 768px) 192px, 256px"
                className="object-cover"
              />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-4xl font-black text-white mb-2">{movie.title}</h2>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/70 mb-6">
              {movie.year && (
                <div className="flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{movie.year}</span>
                </div>
              )}
              {movie.runtime && (
                <div className="flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{movie.runtime}</span>
                </div>
              )}
              {movie.tmdbRating && (
                <div className="flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full text-sm">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-white">{movie.tmdbRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {movie.overview && (
              <p className="text-white/80 text-lg leading-relaxed line-clamp-4 mb-8">
                {movie.overview}
              </p>
            )}

            <AddFromShareButton movie={movie} shareId={params.shareId} />
          </div>
        </div>
        
        {/* Footer Link */}
        <div className="mt-12 text-center z-10 animate-fade-in">
          <Link href="/" className="text-white/50 hover:text-white transition-colors text-sm">
            What is Reelist Elite?
          </Link>
        </div>

      </div>
    </div>
  );
}
