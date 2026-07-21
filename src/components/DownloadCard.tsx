import { motion } from "framer-motion";
import { Download, Music, Video, Image, Sparkles, User, MonitorPlay, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { TikTokResult } from "@/lib/tiktok";

interface DownloadCardProps {
  result: TikTokResult;
}

const DownloadCard = ({ result }: DownloadCardProps) => {
  const { toast } = useToast();

  const handleDownload = async (url: string, filename: string) => {
    if (!url) {
      toast({ title: "URL tidak tersedia", description: "Link download tidak ditemukan.", variant: "destructive" });
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
      console.warn("[Direct Download] Fetch gagal, fallback ke tab baru:", err);
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
        toast({ title: "Popup diblokir", description: "Izinkan popup untuk site ini.", variant: "destructive" });
      } else {
        toast({ title: "Dibuka di tab baru", description: "Tekan Ctrl+S untuk menyimpan." });
      }
    }
  };

  const isSlideshow = result.images.length > 0;

  // Determine which buttons to show
  const hasHd = !!result.video_hd;
  const hasWm = !!result.wm;
  const hasVideo = !!result.video;
  const hasAudio = !!result.audio;

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
            {result.cover ? (
              <img src={result.cover} alt="Thumbnail" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              {isSlideshow ? <Image className="h-8 w-8 text-foreground" /> : <Video className="h-8 w-8 text-foreground" />}
            </div>
            {hasHd && (
              <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg border-2 border-foreground bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
                <Sparkles className="h-3 w-3" />
                HD
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
            {result.quality && (
              <p className="mt-1 text-xs font-bold text-muted-foreground">Kualitas: {result.quality}</p>
            )}
          </div>

          {/* Download Buttons - Simplified & Smart */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* 
              LOGIC:
              - Kalau ada HD (beda dari SD): tampilkan HD sebagai primary
              - Kalau cuma SD: tampilkan SD
              - Kalau HD == SD (deduplicated): cuma tampilkan SD
            */}

            {/* Primary Video Download (HD if available, else SD) */}
            {hasHd ? (
              <Button
                size="lg"
                onClick={() => handleDownload(result.video_hd!, `tiktok_hd_${Date.now()}.mp4`)}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-primary font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <MonitorPlay className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Download HD</span>
                <span className="sm:hidden">HD</span>
              </Button>
            ) : hasVideo ? (
              <Button
                size="lg"
                onClick={() => handleDownload(result.video!, `tiktok_${Date.now()}.mp4`)}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-primary font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <FileVideo className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Download Video</span>
                <span className="sm:hidden">Video</span>
              </Button>
            ) : null}

            {/* SD Fallback (only if HD exists and user wants SD) */}
            {hasHd && hasVideo && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.video!, `tiktok_sd_${Date.now()}.mp4`)}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-primary/70 font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">SD Quality</span>
                <span className="sm:hidden">SD</span>
              </Button>
            )}

            {/* With Watermark (only if truly different) */}
            {hasWm && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.wm!, `tiktok_wm_${Date.now()}.mp4`)}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-secondary font-black uppercase tracking-wide text-secondary-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Video className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Dengan Watermark</span>
                <span className="sm:hidden">WM</span>
              </Button>
            )}

            {/* Audio */}
            {hasAudio && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.audio!, `tiktok_audio_${Date.now()}.mp3`)}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-accent font-black uppercase tracking-wide text-accent-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Music className="mr-2 h-4 w-4" />
                Audio
              </Button>
            )}
          </div>

          {/* Info text */}
          {!hasHd && !hasWm && hasVideo && (
            <p className="text-xs font-semibold text-muted-foreground">
              ℹ️ API gratis: HD/WM tidak tersedia terpisah untuk video ini.
            </p>
          )}

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
                {result.images.slice(0, 10).map((img, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleDownload(img, `tiktok_slide_${index + 1}.jpg`)}
                    className="group relative aspect-square overflow-hidden rounded-xl border-2 border-foreground bg-muted shadow-[2px_2px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    <img src={img} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/90 opacity-0 transition-opacity group-hover:opacity-100">
                      <Download className="h-5 w-5 text-primary-foreground" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DownloadCard;
