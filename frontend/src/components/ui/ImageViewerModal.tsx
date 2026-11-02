import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
} from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  title = 'Bill / Receipt Image',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialIndex when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, images.length]);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.35, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(prev - 0.35, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    handleResetZoom();
  }, [images.length, handleResetZoom]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    handleResetZoom();
  }, [images.length, handleResetZoom]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Drag to pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `bill-receipt-${currentIndex + 1}.jpg`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Floating Control Bar */}
      <header className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3 text-white z-20 shrink-0 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold truncate text-slate-100">
              {title}
            </h3>
            {images.length > 1 && (
              <span className="text-xs text-slate-400 font-mono">
                Photo {currentIndex + 1} of {images.length}
              </span>
            )}
          </div>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            title="Zoom Out (-)"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Zoom Percentage / Reset */}
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset Zoom (0)"
            className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            title="Zoom In (+)"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            title="Rotate 90°"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block" />

          {/* Open in New Tab */}
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Original in New Tab"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            title="Download Image"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            title="Close (ESC)"
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-white active:scale-95 transition-all cursor-pointer ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Image Stage */}
      <main
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 relative flex items-center justify-center overflow-hidden p-4 sm:p-8 ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image"
            className="absolute left-3 sm:left-6 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white shadow-xl backdrop-blur-xs transition-all cursor-pointer active:scale-90"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image"
            className="absolute right-3 sm:right-6 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white shadow-xl backdrop-blur-xs transition-all cursor-pointer active:scale-90"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Display Image */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
          }}
          className="max-w-full max-h-full flex items-center justify-center will-change-transform"
        >
          <img
            src={currentImage}
            alt={`Bill preview ${currentIndex + 1}`}
            draggable={false}
            className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
          />
        </div>
      </main>

      {/* Bottom Thumbnail Strip (if multiple images) */}
      {images.length > 1 ? (
        <footer className="h-24 px-4 pb-4 flex items-center justify-center gap-2.5 z-20 overflow-x-auto bg-gradient-to-t from-black/70 to-transparent">
          {images.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                handleResetZoom();
              }}
              className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                idx === currentIndex
                  ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/50'
                  : 'border-slate-700/80 opacity-60 hover:opacity-100 hover:border-slate-500'
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </footer>
      ) : (
        <div className="h-6" />
      )}
    </div>
  );
};
