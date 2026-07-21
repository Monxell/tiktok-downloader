import { useRef, useCallback } from "react";
import { ClipboardPaste, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PasteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export default function PasteInput({ value, onChange, placeholder, onSubmit }: PasteInputProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePaste = useCallback(async () => {
    // Fokus input dulu biar user tau mau ngetik/manual paste
    inputRef.current?.focus();

    try {
      // Layer 1: Modern Clipboard API (hanya work di HTTPS + user gesture)
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text?.trim()) {
          onChange(text.trim());
          toast({ title: "Berhasil menempel!" });
          return;
        }
      }

      // Layer 2: Kalau clipboard kosong atau API nggak support
      throw new Error("Clipboard empty or unsupported");
    } catch {
      // Layer 3: Fallback — kasih tau user buat manual paste, JANGAN kasih toast merah ganggu
      // Cukup focus input dan select all biar user langsung bisa Ctrl+V / tap & hold → Paste
      inputRef.current?.select();

      toast({
        title: "Gagal Menempel",
        description: "Silakan tempel URL secara manual (tekan & tahan input → Paste)",
        variant: "destructive",
      });
    }
  }, [onChange, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        inputMode="url"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Tempel link TikTok di sini..."}
        className="w-full rounded-xl border-2 border-foreground bg-background px-4 py-3 pr-24 text-sm font-semibold text-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] outline-none transition-all placeholder:text-muted-foreground focus:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] focus:translate-x-[2px] focus:translate-y-[2px] md:text-base"
      />

      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value && (
          <button
            onClick={() => onChange("")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            type="button"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={handlePaste}
          className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          type="button"
          aria-label="Paste"
        >
          <ClipboardPaste className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
