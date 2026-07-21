import { useState, useEffect, useCallback } from "react";

export interface HistoryItem {
  id: string;
  type: "video" | "audio" | "image";
  label: string;
  url: string;
  author: string;
  desc: string;
  timestamp: number;
}

export function useDownloadHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tikmon-history");
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const addToHistory = useCallback((item: Omit<HistoryItem, "id" | "timestamp">) => {
    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    setHistory((prev) => {
      const next = [newItem, ...prev].slice(0, 50);
      localStorage.setItem("tikmon-history", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem("tikmon-history", JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem("tikmon-history");
  }, []);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
