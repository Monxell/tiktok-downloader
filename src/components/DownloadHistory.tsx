import { motion, AnimatePresence } from "framer-motion";
import { History, X, FileVideo, Volume2, Image, Trash2, Download } from "lucide-react";
import type { HistoryItem } from "@/contexts/HistoryContext";

interface Props {
  history: HistoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function DownloadHistory({ history, isOpen, onClose, onRemove, onClear }: Props) {
  const getIcon = (type: HistoryItem["type"]) => {
    switch (type) {
      case "video":
        return <FileVideo className="h-5 w-5 text-primary" />;
      case "audio":
        return <Volume2 className="h-5 w-5 text-accent" />;
      case "image":
        return <Image className="h-5 w-5 text-emerald-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l-2 border-foreground bg-card shadow-[-4px_0_0_0_hsl(var(--foreground))]"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b-2 border-foreground p-4">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  <h2 className="text-lg font-black">Download History</h2>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-foreground bg-secondary shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {history.length === 0 ? (
                  <p className="mt-10 text-center text-sm font-bold text-muted-foreground">
                    No downloads yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 rounded-xl border-2 border-foreground bg-background p-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-muted">
                          {getIcon(item.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black">{item.label}</p>
                          <p className="truncate text-[10px] font-semibold text-muted-foreground">
                            @{item.author}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => onRemove(item.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-foreground bg-destructive text-white shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {history.length > 0 && (
                <div className="border-t-2 border-foreground p-4">
                  <button
                    onClick={onClear}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-destructive py-3 font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear History
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
