'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Movie } from '@/types/movie';
import { useAuth } from '@/contexts/AuthContext';
import { createShareLink } from '@/lib/firebase/firestore';

interface Props {
  movie: Movie;
  className?: string;
}

export default function ShareButton({ movie, className = '' }: Props) {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("Please log in to share movies.");
      return;
    }

    setSharing(true);
    try {
      const shareId = await createShareLink(
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'A friend',
        user.photoURL || undefined,
        movie
      );

      const shareUrl = `${window.location.origin}/share/${shareId}`;
      const shareTitle = `Check out ${movie.title} on Reelist Elite!`;
      const shareText = `I thought you might like this movie I found on Reelist Elite.`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
        } catch (err) {
          // Fallback if user cancels the native share or it fails
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } else {
        // Fallback for desktop/unsupported browsers
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Error creating share link:", err);
      alert("Failed to create share link. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className={`p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      title="Share Movie"
    >
      {copied ? (
        <Check className="w-5 h-5 text-green-400" />
      ) : (
        <Share2 className={`w-5 h-5 ${sharing ? 'animate-pulse text-primary' : ''}`} />
      )}
    </button>
  );
}
