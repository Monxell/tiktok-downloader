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

  const handleDownload = async (url: string | null, filename: string) => {
    if (!url) {
      toast({ title: "URL tidak tersedia", description: "Link download tidak ditemukan.", variant: "destructive" });
      return;
    }

    toast({ title: "Memulai download...", description: filename });

    try {
      // For audio files, try fetch with no-cors as fallback strategy
      const response = await fetch(url, { 
        method: "GET",
        // Note: mode: 'cors' is default, but some audio CDN might block
      });

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
      console.warn("[Direct Download] Fetch gagal, mencoba fallback:", err);

      // Strategy 2: Try opening in new tab with download attribute via proxy
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Membuka link download...", description: "Tekan Ctrl+S untuk menyimpan." });
    }
  };

  const isSlideshow = result.images.length > 0;
  const hasVideo = !!result.video || !!result.video_hd;
  const hasAudio = !!result.audio;

  const videoFileName = generateFileName("tikmon", "mp4");
  const audioFileName = generateFileName("tikmon_audio", "mp3");

  // Debug: log cover URL
  console.log("[DownloadCard] Cover URL:", result.cover);
  console.log("[DownloadCard] Audio URL:", result.audio);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full rounded-2xl border-2 border-foreground bg-card p-5 shadow-[5px_5px_0px_0px_hsl(var(--foreground))] md:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:gap-6">
        {/* Preview */}
        <div className="flex-shrink-0">
          <div className="relative mx-auto h-52 w-36 overflow-hidden rounded-xl border-2 border-foreground bg-muted shadow-[4px_4px_0px_0px_hsl(var(--foreground))] md:h-60 md:w-44">

            {/* Cover Image with multiple fallback strategies */}
            {result.cover ? (
              <img
                src={result.cover}
                alt="Thumbnail video"
                className="h-full w-full object-cover"
                crossOrigin="anonymous"
                onLoad={() => console.log("[Thumbnail] Loaded successfully:", result.cover)}
                onError={(e) => {
                  console.warn("[Thumbnail] Failed to load:", result.cover, "Error:", e);
                  // Try to reload without crossOrigin
                  const img = e.currentTarget;
                  img.crossOrigin = "";
                  img.src = result.cover + "?retry=1";

                  // If still fails, hide the image
                  img.onerror = () => {
                    console.warn("[Thumbnail] Retry failed, hiding image");
                    img.style.display = 'none';
                  };
                }}
                loading="eager"
              />
            ) : null}

            {/* Placeholder when no cover or image failed */}
            <div className={`absolute inset-0 flex items-center justify-center bg-muted ${result.cover ? 'bg-background/30' : ''}`}>
              {isSlideshow ? (
                <Image className="h-10 w-10 text-muted-foreground" />
              ) : (
                <Video className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

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

            <p className="mt-2 text-xs font-mono text-muted-foreground break-all">
              {videoFileName}
            </p>
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

          {/* Info */}
          <p className="text-xs font-semibold text-muted-foreground">
            ℹ️ Kualitas video mengikuti kualitas asli di TikTok. API gratisan tidak menyediakan versi HD/SD/WM terpisah.
          </p>

          {/* Slideshow Images */}
          {isSlideshow && (
            <div className="mt-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
                  <Image className="h-3 w-3 text-primary-foreground" />
                </div>
                <p className="text-sm font-black uppercase text-foreground">Slideshow ({result.images.length} foto)</p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {result.images.slice(0, 10).map((img, index) => {
                  const slideFileName = generateFileName(`tikmon_slide${index + 1}`, "jpg");
                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleDownload(img, slideFileName)}
                      className="group relative aspect-square overflow-hidden rounded-xl border-2 border-foreground bg-muted shadow-[2px_2px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                      <img src={img} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/90 opacity-0 transition-opacity group-hover:opacity-100">
                        <Download className="h-5 w-5 text-primary-foreground" />
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
