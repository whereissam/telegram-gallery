import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";

export interface GalleryImage {
  id: number;
  date: number;
  message: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
}

interface GalleryGridProps {
  images: GalleryImage[];
  onImageClick: (index: number) => void;
}

function GalleryItem({
  image,
  index,
  onImageClick,
}: {
  image: GalleryImage;
  index: number;
  onImageClick: (index: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setErrored(true), []);

  const dateStr = new Date(image.date * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const caption = image.message || dateStr;

  return (
    <div
      className="mb-3 break-inside-avoid cursor-pointer group relative rounded-xl overflow-hidden"
      onClick={() => onImageClick(index)}
    >
      {/* Skeleton placeholder */}
      {!loaded && !errored && (
        <Skeleton className="w-full aspect-[4/3] rounded-xl" />
      )}

      {/* Error state */}
      {errored && (
        <div className="w-full aspect-[4/3] rounded-xl bg-secondary/50 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}

      {/* Image */}
      <img
        src={image.thumbnailUrl}
        alt={caption}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
          loaded ? "gallery-img-loaded" : "opacity-0 absolute"
        }`}
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
        <div className="p-3 w-full">
          {image.message && (
            <p className="text-white/90 text-sm font-medium leading-snug line-clamp-2 mb-1">
              {image.message}
            </p>
          )}
          <p className="text-white/50 text-xs">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}

export function GalleryGrid({ images, onImageClick }: GalleryGridProps) {
  if (images.length === 0) return null;

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
      {images.map((image, index) => (
        <GalleryItem
          key={image.id}
          image={image}
          index={index}
          onImageClick={onImageClick}
        />
      ))}
    </div>
  );
}
