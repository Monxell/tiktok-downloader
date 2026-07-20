import { motion } from "framer-motion";
import { Download, Music, Video, Image, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TikTokResult } from "@/lib/tiktok";

interface DownloadCardProps {
  result: TikTokResult;
}

const DownloadCard = ({ result }: DownloadCardProps) => {
  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSlideshow = result.images.length > 0;

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
              <img
                src={result.cover}
                alt="Thumbnail video"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              {isSlideshow ? (
                <Image className="h-8 w-8 text-foreground" />
              ) : (
                <Video className="h-8 w-8 text-foreground" />
              )}
            </div>
            {/* HD Badge */}
            <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg border-2 border-foreground bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
              <Sparkles className="h-3 w-3" />
              HD
            </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.video && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.video!, `tiktok_${Date.now()}.mp4`)}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-primary font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Tanpa WM</span>
                <span className="sm:hidden">No WM</span>
              </Button>
            )}

            {result.wm && (
              <Button
                size="lg"
                onClick={() => handleDownload(result.wm!, `tiktok_wm_${Date.now()}.mp4`)}
                className="h-11 w-full rounded-xl border-2 border-foreground bg-secondary font-black uppercase tracking-wide text-secondary-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Video className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Dengan WM</span>
                <span className="sm:hidden">WM</span>
              </Button>
            )}

            {result.audio && (
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

          {/* Slideshow Images */}
          {isSlideshow && (
            <div className="mt-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
                  <Image className="h-3 w-3 text-primary-foreground" />
                </div>
                <p className="text-sm font-black uppercase text-foreground">
                  Slideshow ({result.images.length})
                </p>
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
                    <img
                      src={img}
                      alt={`Slide ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
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
