import { useState, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import type { MediaMessage } from "../../shared/types";

export interface GalleryImage extends MediaMessage {
  mediaUrl: string;
  thumbnailUrl: string;
}

export type ColumnCount = 2 | 3 | 4;

interface GalleryGridProps {
  images: GalleryImage[];
  onImageClick: (index: number) => void;
  columns?: ColumnCount;
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
      {!loaded && !errored && (
        <Skeleton className="w-full aspect-[4/3] rounded-xl" />
      )}

      {errored && (
        <div className="w-full aspect-[4/3] rounded-xl bg-secondary/50 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}

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

const columnClasses: Record<ColumnCount, string> = {
  2: "columns-1 sm:columns-2 gap-3",
  3: "columns-1 sm:columns-2 lg:columns-3 gap-3",
  4: "columns-2 sm:columns-3 lg:columns-4 gap-3",
};

interface DateGroup {
  label: string;
  items: { image: GalleryImage; globalIndex: number }[];
}

function groupByDate(images: GalleryImage[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let currentLabel = "";

  for (let i = 0; i < images.length; i++) {
    const label = new Date(images[i].date * 1000).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, items: [] });
    }

    groups[groups.length - 1].items.push({ image: images[i], globalIndex: i });
  }

  return groups;
}

export function GalleryGrid({ images, onImageClick, columns = 3 }: GalleryGridProps) {
  if (images.length === 0) return null;

  const groups = useMemo(() => groupByDate(images), [images]);

  return (
    <div>
      {groups.map((group) => (
        <div key={group.label} className="mb-6">
          <div className="sticky top-[52px] z-30 py-2">
            <span className="text-xs font-medium text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
              {group.label}
            </span>
          </div>
          <div className={columnClasses[columns]}>
            {group.items.map(({ image, globalIndex }) => (
              <GalleryItem
                key={image.id}
                image={image}
                index={globalIndex}
                onImageClick={onImageClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
