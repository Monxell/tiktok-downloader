import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { Download, Clipboard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import DownloadCard from "@/components/DownloadCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { downloadTikTok, isValidTikTokUrl, type TikTokResult } from "@/lib/tiktok";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TikTokResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      if (isValidTikTokUrl(text)) {
        toast({
          title: "URL Ditempel",
          description: "Link TikTok terdeteksi!",
        });
      }
    } catch {
      toast({
        title: "Gagal Menempel",
        description: "Silakan tempel URL secara manual",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!url.trim()) {
      setError("Silakan masukkan URL TikTok");
      return;
    }

    if (!isValidTikTokUrl(url)) {
      setError("Silakan masukkan URL TikTok yang valid");
      return;
    }

    setLoading(true);

    try {
      const data = await downloadTikTok(url);
      if (data.status) {
        setResult(data);
      } else {
        setError("Gagal mengambil video. Silakan coba lagi.");
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background px-4 pb-12 pt-4 md:px-6"
    >
      <div className="mx-auto max-w-2xl">
        <Header />

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          className="mt-4 md:mt-8"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Tempel link TikTok di sini..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 border-2 border-foreground bg-background pr-12 text-base font-medium shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all focus:shadow-[5px_5px_0px_0px_hsl(var(--foreground))] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 border-2 border-foreground bg-secondary p-2 text-foreground transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  aria-label="Tempel dari clipboard"
                >
                  <Clipboard className="h-5 w-5" />
                </button>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-12 border-2 border-foreground bg-primary px-8 font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_hsl(var(--foreground))] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_hsl(var(--foreground))]"
              >
                <Download className="mr-2 h-5 w-5" />
                {loading ? "Memproses..." : "Unduh"}
              </Button>
            </div>
          </form>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 border-2 border-foreground bg-secondary p-4 text-center shadow-[4px_4px_0px_0px_hsl(var(--foreground))]"
          >
            <p className="text-sm font-semibold text-foreground">
              Tempel link video atau slideshow TikTok untuk mengunduh tanpa watermark
            </p>
          </motion.div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 flex items-center gap-3 border-2 border-foreground bg-destructive/20 p-4 font-bold text-destructive shadow-[4px_4px_0px_0px_hsl(var(--foreground))]"
            >
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8"
          >
            <LoadingSpinner />
            <p className="mt-3 text-center text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Mengambil data video...
            </p>
          </motion.div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <DownloadCard result={result} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-block border-2 border-foreground bg-card px-4 py-2 shadow-[3px_3px_0px_0px_hsl(var(--foreground))]">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Unduh video TikTok tanpa watermark secara gratis
            </p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
