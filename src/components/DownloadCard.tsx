import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Video, Image, Sparkles, User, FileVideo, Volume2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDownloadHistory } from "@/hooks/useDownloadHistory";
import type { TikTokResult } from "@/lib/tiktok";
import { generateFileName } from "@/lib/tiktok";

interface DownloadCardProps {
  result: TikTokResult;
}

const DownloadCard = ({ result }: DownloadCardProps) => {
  const { toast } = useToast();
  const { addToHistory } = useDownloadHistory();
  const [capturedThumb, setCapturedThumb] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const isSlideshow = result.images.length > 0;
  const hasVideo = !!result.video && !isSlideshow;
  const hasHd = !!result.video_hd && !isSlideshow;
  const hasAudio = !!result.audio;

  // ─── CAPTURE 1 FRAME DARI VIDEO ─────────────────────────
  const captureFrame = useCallback(() => {
    if (!result.video || isSlideshow || capturedThumb || thumbError) return;

    setIsCapturing(true);
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = result.video;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.style.position = "fixed";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.top = "0";
    video.style.left = "0";
    document.body.appendChild(video);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (video.parentNode) document.body.removeChild(video);
      setIsCapturing(false);
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 360;
        const h = video.videoHeight || 640;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No 2d context");

        ctx.drawImage(video, 0, 0, w, h);
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        if (pixel[3] === 0) throw new Error("Blank frame");

        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedThumb(dataUrl);
      } catch (err) {
        console.warn("[Capture] Failed:", err);
        setThumbError(true);
      } finally {
        cleanup();
      }
    };

    const onError = () => {
      console.warn("[Capture] Video error");
      setThumbError(true);
      cleanup();
    };

    video.addEventListener("loadeddata", () => {
      try {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      } catch {
        setThumbError(true);
        cleanup();
      }
    });
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);

    video.load();
    return cleanup;
  }, [result.video, isSlideshow, capturedThumb, thumbError]);

  useEffect(() => {
    const cleanup = captureFrame();
    return cleanup;
  }, [captureFrame]);

  // ─── THUMBNAIL ──────────────────────────────────────────
  const thumbnailSrc = isSlideshow
    ? result.images[0] || null
    : result.cover || capturedThumb || null;

  const hasThumbnail = !!thumbnailSrc && !thumbError;

  const videoFileName = generateFileName("tikmon", "mp4");
  const hdFileName = generateFileName("tikmon_hd", "mp4");
  const audioFileName = generateFileName("tikmon_audio", "mp3");

  const handleDownload = async (
    url: string | null,
    filename: string,
    type: "video" | "audio" | "image"
  ) => {
    if (!url) {
      toast({
        title: "URL not available",
        description: "Link not found.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Starting download...", description: filename });
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

      addToHistory({
        type,
        label: filename,
        url,
        author: result.author,
        desc: result.desc,
      });

      toast({ title: "Download started!", description: filename });
    } catch (err) {
      console.warn("[Download] CORS blocked, opening in new tab:", err);
      window.open(url, "_blank", "noopener,noreferrer");

      addToHistory({
        type,
        label: filename,
        url,
        author: result.author,
        desc: result.desc,
      });

      toast({
        title: "Opened in new tab",
        description: "Tap the menu (⋮) → Download to save the file.",
      });
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
            {hasThumbnail ? (
              <img
                src={thumbnailSrc}
                alt="Thumbnail"
                className="h-full w-full object-cover"
                loading="eager"
                onError={() => {
                  console.warn("[Thumbnail] Failed");
                  setThumbError(true);
                }}
              />
            ) : null}

            {!hasThumbnail && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/20 to-accent/20">
                {isSlideshow ? (
                  <Image className="h-10 w-10 text-foreground" />
                ) : (
                  <Video className="h-10 w-10 text-foreground" />
                )}
                <span className="text-[10px] font-black uppercase text-foreground">
                  {isSlideshow ? `${result.images.length} Photos` : isCapturing ? "Loading..." : "Video"}
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
                {result.images.length} Photos
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
            <p className="line-clamp-2 text-sm font-semibold text-foreground md:text-base">
              {result.desc}
            </p>
          </div>

          {/* Download Buttons */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hasVideo && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.video, videoFileName, "video")}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-primary font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <FileVideo className="mr-2 h-4 w-4" />
                VIDEO MP4 SD
              </Button>
            )}

            {hasHd && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.video_hd, hdFileName, "video")}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-emerald-500 font-black uppercase tracking-wide text-white shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                VIDEO MP4 HD
              </Button>
            )}

            {hasAudio && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.audio, audioFileName, "audio")}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-accent font-black uppercase tracking-wide text-accent-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Volume2 className="mr-2 h-4 w-4" />
                AUDIO MP3
              </Button>
            )}
          </div>

          {/* Info — CENTER + ICON (not emoji) + ENGLISH */}
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Video quality follows the original quality on TikTok.</span>
          </div>

          {/* Slideshow */}
          {isSlideshow && (
            <div className="mt-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
                  <Image className="h-3 w-3 text-primary-foreground" />
                </div>
                <p className="text-sm font-black uppercase text-foreground">
                  Slideshow ({result.images.length} photos)
                </p>
              </div>

              <div
                className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {result.images.map((img, index) => {
                  const slideFileName = generateFileName(`tikmon_slide${index + 1}`, "jpg");
                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleDownload(img, slideFileName, "image")}
                      className="group relative flex-shrink-0 w-32 h-40 overflow-hidden rounded-xl border-2 border-foreground bg-muted shadow-[2px_2px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none snap-start"
                    >
                      <img
                        src={img}
                        alt={`Slide ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
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
