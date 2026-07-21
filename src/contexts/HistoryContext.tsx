import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface HistoryItem {
  id: string;
  type: "video" | "audio" | "image";
  label: string;
  url: string;
  author: string;
  desc: string;
  timestamp: number;
}

interface HistoryContextType {
  history: HistoryItem[];
  addToHistory: (item: Omit<HistoryItem, "id" | "timestamp">) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tikmon-history");
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // ignore
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      localStorage.setItem("tikmon-history", JSON.stringify(history));
    }
  }, [history, initialized]);

  const addToHistory = useCallback((item: Omit<HistoryItem, "id" | "timestamp">) => {
    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    setHistory((prev) => [newItem, ...prev].slice(0, 50));
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <HistoryContext.Provider value={{ history, addToHistory, removeFromHistory, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
