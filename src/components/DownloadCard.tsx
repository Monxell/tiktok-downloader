import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Download, Music, Video, Image, Sparkles, User, FileVideo, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { TikTokResult } from "@/lib/tiktok";
import { generateFileName } from "@/lib/tiktok";

interface DownloadCardProps {
  result: TikTokResult;
}

const DownloadCard = ({ result }: DownloadCardProps) => {
  const { toast } = useToast();
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isSlideshow = result.images.length > 0;
  const hasVideo = !!result.video && !isSlideshow;
  const hasAudio = !!result.audio;

  // ─── CAPTURE VIDEO FRAME (FALLBACK ONLY) ──────────────────
  useEffect(() => {
    if (!result.video || result.images.length > 0) return;
    if (result.cover) return; // Skip kalau API udah kasih cover

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = result.video;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    // Attach ke DOM (hidden) biar mobile browser mau load
    video.style.position = "absolute";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.style.width = "1px";
    video.style.height = "1px";
    document.body.appendChild(video);

    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      video.pause();
      video.src = "";
      video.load();
      if (video.parentNode) document.body.removeChild(video);
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      } catch {
        cleanup();
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // Validasi: cek apakah canvas benar-benar ada pixel (bukan blank)
          const pixel = ctx.getImageData(0, 0, 1, 1).data;
          const isBlank = pixel[3] === 0; // alpha 0 = transparent
          if (!isBlank) {
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            setCapturedThumbnail(dataUrl);
          }
        }
      } catch (err) {
        console.warn("[Canvas] Capture failed:", err);
      } finally {
        cleanup();
      }
    };

    video.onerror = () => {
      console.warn("[Video] Failed to load for thumbnail");
      cleanup();
    };

    video.load();

    return cleanup;
  }, [result.video, result.images.length, result.cover]);

  // ─── PRIORITAS THUMBNAIL ─────────────────────────────────
  // API cover paling reliable. Canvas cuma fallback.
  const thumbnailSrc = result.cover || capturedThumbnail || (isSlideshow ? result.images[0] : null);
  const hasThumbnail = !!thumbnailSrc && !thumbError;

  const videoFileName = generateFileName("tikmon", "mp4");
  const audioFileName = generateFileName("tikmon_audio", "mp3");

  const handleDownload = async (url: string | null, filename: string) => {
    if (!url) {
      toast({ title: "URL tidak tersedia", description: "Link tidak ditemukan.", variant: "destructive" });
      return;
    }
    toast({ title: "Memulai download...", description: filename });
    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
      toast({ title: "Download dimulai!", description: filename });
    } catch (err) {
      console.warn("[Download] CORS blocked, opening in new tab:", err);
      window.open(url, "_blank", "noopener,noreferrer");
      toast({ title: "Dibuka di tab baru", description: "Tekan titik 3 (⋮) → Download untuk menyimpan file." });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full rounded-2xl border-2 border-foreground bg-card p-5 shadow-[5px_5px_0px_0px_hsl(var(--foreground))] md:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:gap-6">
        {/* Preview Area */}
        <div className="flex-shrink-0">
          <div className="relative mx-auto h-52 w-36 overflow-hidden rounded-xl border-2 border-foreground bg-muted shadow-[4px_4px_0px_0px_hsl(var(--foreground))] md:h-60 md:w-44">

            {/* Thumbnail Image */}
            {hasThumbnail ? (
              <img
                src={thumbnailSrc}
                alt="Thumbnail"
                className="h-full w-full object-cover"
                loading="eager"
                onError={() => {
                  console.warn("[Thumbnail] Failed to load:", thumbnailSrc?.substring(0, 60));
                  setThumbError(true);
                }}
              />
            ) : null}

            {/* Placeholder — muncul kalau no thumbnail ATAU image error */}
            {!hasThumbnail && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/20 to-accent/20">
                {isSlideshow ? (
                  <Image className="h-10 w-10 text-foreground" />
                ) : (
                  <Video className="h-10 w-10 text-foreground" />
                )}
                <span className="text-[10px] font-black uppercase text-foreground">
                  {isSlideshow ? `${result.images.length} Foto` : "Video"}
                </span>
              </div>
            )}

            {hasVideo && (
              <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg border-2 border-foreground bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
                <Sparkles className="h-3 w-3" />
                MP4
              </div>
            )}
            {isSlideshow && (
              <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg border-2 border-foreground bg-accent px-2 py-0.5 text-[10px] font-black uppercase text-accent-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
                <Image className="h-3 w-3" />
                {result.images.length} Foto
              </div>
            )}
          </div>
        </div>

        {/* Info & Buttons */}
        <div className="flex flex-1 flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <p className="text-sm font-black text-primary">@{result.author}</p>
            </div>
            <p className="line-clamp-2 text-sm font-semibold text-foreground md:text-base">{result.desc}</p>
          </div>

          {/* Download Buttons */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hasVideo && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.video, videoFileName)}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-primary font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <FileVideo className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Download Video</span>
                <span className="sm:hidden">Video</span>
              </Button>
            )}

            {hasAudio && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.audio, audioFileName)}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-accent font-black uppercase tracking-wide text-accent-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Volume2 className="mr-2 h-4 w-4" />
                Audio
              </Button>
            )}
          </div>

          <p className="text-xs font-semibold text-muted-foreground">
            ℹ️ Kualitas video mengikuti kualitas asli di TikTok.
          </p>

          {/* Slideshow */}
          {isSlideshow && (
            <div className="mt-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
                  <Image className="h-3 w-3 text-primary-foreground" />
                </div>
                <p className="text-sm font-black uppercase text-foreground">Slideshow ({result.images.length} foto)</p>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {result.images.map((img, index) => {
                  const slideFileName = generateFileName(`tikmon_slide${index + 1}`, "jpg");
                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleDownload(img, slideFileName)}
                      className="group relative flex-shrink-0 w-32 h-40 overflow-hidden rounded-xl border-2 border-foreground bg-muted shadow-[2px_2px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none snap-start"
                    >
                      <img src={img} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/90 opacity-0 transition-opacity group-hover:opacity-100">
                        <Download className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="absolute bottom-1 right-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-black text-foreground border border-foreground">
                        {index + 1}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DownloadCard;
