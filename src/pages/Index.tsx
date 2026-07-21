import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { Download, Clipboard, AlertCircle, Link2, X } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
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

  // ─── PASTE FIX: Robust dengan fallback ───────────────────
  const handlePaste = useCallback(async () => {
    // Fokus input dulu
    inputRef.current?.focus();

    try {
      // Layer 1: Modern Clipboard API (hanya work di HTTPS + user gesture)
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text?.trim()) {
          setUrl(text.trim());
          if (isValidTikTokUrl(text.trim())) {
            toast({ title: "URL Ditempel", description: "Link TikTok terdeteksi!" });
          }
          return;
        }
      }
      // Kalau clipboard kosong atau API nggak ada
      throw new Error("Clipboard empty or unsupported");
    } catch {
      // Layer 2: Fallback — select all input biar user langsung Ctrl+V / tap & hold → Paste
      inputRef.current?.select();
      toast({
        title: "Gagal Menempel",
        description: "Silakan tempel URL secara manual (tekan & tahan input → Paste)",
        variant: "destructive",
      });
    }
  }, [toast]);

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
      className="min-h-screen bg-background px-4 pb-12 pt-2 md:px-6"
    >
      <div className="mx-auto max-w-2xl">
        <Header />

        {/* Main Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="mt-2 rounded-2xl border-2 border-foreground bg-card p-5 shadow-[5px_5px_0px_0px_hsl(var(--foreground))] md:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-primary shadow-[3px_3px_0px_0px_hsl(var(--foreground))]">
              <Link2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Unduh Video</h2>
              <p className="text-xs font-medium text-muted-foreground">
                Tanpa watermark, gratis & cepat
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="Tempel link TikTok di sini..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 rounded-xl border-2 border-foreground bg-background pr-24 text-base font-semibold shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all placeholder:font-medium placeholder:text-muted-foreground focus:shadow-[5px_5px_0px_0px_hsl(var(--foreground))] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {/* Clear button */}
                  {url && (
                    <button
                      type="button"
                      onClick={() => setUrl("")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Hapus"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {/* Paste button */}
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="rounded-lg border-2 border-foreground bg-secondary p-2 text-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    aria-label="Tempel dari clipboard"
                  >
                    <Clipboard className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-12 rounded-xl border-2 border-foreground bg-primary px-7 font-black text-primary-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_hsl(var(--foreground))] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-60"
              >
                <Download className="mr-2 h-5 w-5" />
                {loading ? "Memproses..." : "Unduh"}
              </Button>
            </div>
          </form>

          <div className="mt-5 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/30 p-3 text-center">
            <p className="text-xs font-semibold text-muted-foreground">
              Tempel link video atau slideshow TikTok untuk mengunduh tanpa watermark
            </p>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-foreground bg-destructive/15 p-4 font-bold text-destructive shadow-[4px_4px_0px_0px_hsl(var(--foreground))]"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-destructive shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6"
          >
            <div className="rounded-2xl border-2 border-foreground bg-card p-6 shadow-[5px_5px_0px_0px_hsl(var(--foreground))]">
              <LoadingSpinner />
              <p className="mt-3 text-center text-sm font-black uppercase tracking-wide text-muted-foreground">
                Mengambil data video...
              </p>
            </div>
          </motion.div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-5"
            >
              <DownloadCard result={result} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Unduh video TikTok tanpa watermark secara gratis
          </p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
