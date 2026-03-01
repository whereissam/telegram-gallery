import { useEffect, useCallback, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import type { GalleryImage } from "./GalleryGrid";

interface ImageLightboxProps {
  images: GalleryImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (currentIndex < 0 || currentIndex >= images.length) {
    onClose();
    return null;
  }

  const image = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  useEffect(() => {
    setImgLoaded(false);
  }, [currentIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
    },
    [onClose, onNavigate, currentIndex, hasPrev, hasNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "application/pdf": "pdf",
    };
    const ext = extMap[image.mimeType] || image.mimeType?.split("/")[1] || "bin";
    const a = document.createElement("a");
    a.href = image.mediaUrl;
    a.download = `telegram-${image.id}.${ext}`;
    a.target = "_blank";
    a.click();
  };

  const dateStr = new Date(image.date * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: "lightbox-in 0.2s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
        <span className="text-white/50 text-sm font-medium tabular-nums">
          {currentIndex + 1} / {images.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Download"
          >
            <Download className="w-5 h-5 text-white/70" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </div>

      {/* Nav arrows */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6 text-white/80" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors cursor-pointer"
        >
          <ChevronRight className="w-6 h-6 text-white/80" />
        </button>
      )}

      {/* Image */}
      <div className="relative z-[5] max-w-[90vw] max-h-[80vh] flex items-center justify-center">
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
          </div>
        )}
        <img
          src={image.mediaUrl}
          alt={image.message || `Image ${image.id}`}
          onLoad={() => setImgLoaded(true)}
          className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
          style={{
            animation: imgLoaded ? "lightbox-img-in 0.3s ease-out" : "none",
            opacity: imgLoaded ? 1 : 0,
          }}
          draggable={false}
        />
      </div>

      {/* Bottom caption */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 py-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="max-w-2xl mx-auto text-center">
          {image.message && (
            <p className="text-white/85 text-sm leading-relaxed mb-1">
              {image.message}
            </p>
          )}
          <p className="text-white/40 text-xs">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}
