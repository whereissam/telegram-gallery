import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AuthForm } from "@/components/AuthForm";
import { GalleryGrid, type GalleryImage, type ColumnCount } from "@/components/GalleryGrid";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2, ImageIcon, RefreshCw, LogOut, Search, X, Grid2x2, Grid3x3, LayoutGrid } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export function PrivateTelegramGallery() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastOffsetId, setLastOffsetId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [columns, setColumns] = useState<ColumnCount>(3);
  const [searchQuery, setSearchQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/status`);
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const fetchMessages = useCallback(
    async (offsetId = 0) => {
      const isLoadMore = offsetId > 0;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_URL}/messages?offset_id=${offsetId}&limit=30`
        );
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();

        const newImages: GalleryImage[] = data.messages.map((msg: any) => ({
          id: msg.id,
          date: msg.date,
          message: msg.message,
          mediaType: msg.mediaType,
          mimeType: msg.mimeType || "image/jpeg",
          mediaUrl: `${API_URL}/media/${msg.id}`,
          thumbnailUrl: `${API_URL}/media/${msg.id}?size=thumbnail`,
        }));

        if (isLoadMore) {
          setImages((prev) => [...prev, ...newImages]);
        } else {
          setImages(newImages);
        }
        setHasMore(data.hasMore);
        setLastOffsetId(data.lastOffsetId || 0);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch images"
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Fetch messages when authenticated
  useEffect(() => {
    if (isAuthenticated) fetchMessages();
  }, [isAuthenticated, fetchMessages]);

  const handleLoadMore = useCallback(() => {
    if (lastOffsetId === 0 || loadingMore) return;
    fetchMessages(lastOffsetId);
  }, [lastOffsetId, loadingMore, fetchMessages]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!hasMore || loadingMore || searchQuery) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, searchQuery, handleLoadMore]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, { method: "POST" });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setImages([]);
    setHasMore(false);
    setLastOffsetId(0);
    setSearchQuery("");
  };

  // Client-side search filter
  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) return images;
    const q = searchQuery.toLowerCase();
    return images.filter((img) => img.message.toLowerCase().includes(q));
  }, [images, searchQuery]);

  // Auth check loading
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <AuthForm
        onAuthenticated={() => setIsAuthenticated(true)}
      />
    );
  }

  const columnOptions: { value: ColumnCount; icon: typeof Grid2x2 }[] = [
    { value: 2, icon: Grid2x2 },
    { value: 3, icon: Grid3x3 },
    { value: 4, icon: LayoutGrid },
  ];

  // Authenticated - gallery view
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(199 89% 58% / 0.15)" }}
            >
              <ImageIcon
                className="w-4 h-4"
                style={{ color: "hsl(199 89% 58%)" }}
              />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                Telegram Gallery
              </h1>
              <p className="text-xs text-muted-foreground">Saved Messages</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Search */}
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search captions..."
                className="h-8 w-40 rounded-md bg-secondary/50 border border-border/50 pl-8 pr-7 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1.5 p-0.5 rounded hover:bg-secondary cursor-pointer"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Grid toggle */}
            <div className="flex items-center ml-1 rounded-md border border-border/50 overflow-hidden">
              {columnOptions.map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setColumns(value)}
                  className={`p-1.5 cursor-pointer transition-colors ${
                    columns === value
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                  title={`${value} columns`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchMessages()}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 mb-6">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && images.length === 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton
                key={i}
                className="mb-3 rounded-xl break-inside-avoid"
                style={{
                  height: `${[200, 280, 220, 300, 240, 260, 190, 310, 230][i]}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state — no images at all */}
        {!loading && images.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "hsl(220 14% 14%)" }}
            >
              <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">
              No images found
            </p>
            <p className="text-muted-foreground/60 text-xs">
              Send photos to your Saved Messages in Telegram
            </p>
          </div>
        )}

        {/* Empty state — search has no results */}
        {!loading && images.length > 0 && filteredImages.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "hsl(220 14% 14%)" }}
            >
              <Search className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">
              No results for "{searchQuery}"
            </p>
            <p className="text-muted-foreground/60 text-xs">
              Try a different search term
            </p>
          </div>
        )}

        {/* Gallery */}
        <GalleryGrid
          images={filteredImages}
          onImageClick={(index) => setLightboxIndex(index)}
          columns={columns}
        />

        {/* Infinite scroll sentinel */}
        {hasMore && !searchQuery && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore && (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            )}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={filteredImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(index) => setLightboxIndex(index)}
        />
      )}
    </div>
  );
}
