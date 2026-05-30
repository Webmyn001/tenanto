import { useEffect, useCallback } from 'react';

export default function ImageViewer({ images, currentIndex, onClose, onPrev, onNext }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'ArrowRight') onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const img = images[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Close */}
      <button onClick={onClose} className="fixed right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      {/* Counter */}
      <div className="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Prev */}
      {currentIndex > 0 && (
        <button onClick={onPrev} className="fixed left-4 top-1/2 z-10 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}

      {/* Next */}
      {currentIndex < images.length - 1 && (
        <button onClick={onNext} className="fixed right-4 top-1/2 z-10 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {/* Image */}
      <img
        src={img?.url}
        alt=""
        className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}