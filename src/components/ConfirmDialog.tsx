'use client';

import React, { useEffect, useCallback } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'default';
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, description,
  confirmText = 'Confirm', confirmVariant = 'default'
}: ConfirmDialogProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
  }, [onClose, onConfirm]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" />
      <div
        className="relative bg-[#141418] border border-white/10 rounded-2xl p-6 max-w-sm w-full animate-scaleIn shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        {description && <p className="text-white/40 text-sm mb-6 leading-relaxed">{description}</p>}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold text-sm transition-all active:scale-95">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              confirmVariant === 'danger'
                ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400'
                : 'bg-white hover:bg-neutral-200 text-black'
            }`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
