import axios, { AxiosError } from "axios";

export interface TikTokResult {
  status: boolean;
  video: string | null;      // Video Tanpa Watermark (SD)
  video_hd: string | null;   // Video Tanpa Watermark HD (BARU)
  wm: string | null;         // Video Dengan Watermark
  audio: string | null;      // Audio Only
  images: string[];          // Slideshow Images
  author: string;
  desc: string;
  cover?: string;
}

/* ============================================================
   MULTI-SOURCE TIKTOK DOWNLOADER
   - Source 1: TikWM (primary, fastest)
   - Source 2: TiklyDown (fallback, supports HD)
   - Auto retry 3x per source
   - Auto fallback kalau source utama gagal
   ============================================================ */

// ─── SOURCE 1: TIKWM ─────────────────────────────────────────
async function fetchFromTikWM(url: string): Promise<TikTokResult | null> {
  const host = "https://www.tikwm.com/";

  try {
    const res = await axios.post(
      host + "api/",
      {},
      {
        headers: {
          accept: "application/json, text/javascript, */*; q=0.01",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        params: {
          url: url,
          count: 12,
          cursor: 0,
          web: 1,
          hd: 1,
        },
        timeout: 15000,
      }
    );

    const data = res.data?.data;
    if (!data) return null;

    const formatUrl = (path: string | undefined): string | null => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      return host + path;
    };

    return {
      status: true,
      video: formatUrl(data.play),
      video_hd: formatUrl(data.hdplay),   // HD no watermark
      wm: formatUrl(data.wmplay),         // with watermark
      audio: formatUrl(data.music),       // audio only
      images: Array.isArray(data.images)
        ? data.images.map((img: string) =>
            img.startsWith("http") ? img : host + img
          )
        : [],
      author: data.author?.nickname || data.author?.unique_id || "-",
      desc: data.title || "-",
      cover: data.origin_cover || data.cover || undefined,
    };
  } catch (error) {
    const err = error as AxiosError;
    console.warn("[TikWM] Error:", err.message || err.code);
    return null;
  }
}

// ─── SOURCE 2: TIKLYDOWN ─────────────────────────────────────
async function fetchFromTiklyDown(url: string): Promise<TikTokResult | null> {
  try {
    const res = await axios.get("https://api.tiklydown.eu.org/api/download", {
      params: { url },
      timeout: 15000,
      headers: {
        Accept: "application/json",
      },
    });

    const d = res.data;
    if (!d || d.status === "error") return null;

    const result = d.result || d;

    // Normalize video URLs
    const getVideoUrl = (obj: any): string | null => {
      if (!obj) return null;
      if (typeof obj === "string") return obj;
      if (obj.noWatermark) return obj.noWatermark;
      if (obj.url) return obj.url;
      return null;
    };

    const getVideoHdUrl = (obj: any): string | null => {
      if (!obj) return null;
      if (typeof obj === "string") return obj;
      if (obj.hd) return obj.hd;
      if (obj.hdplay) return obj.hdplay;
      return null;
    };

    const getWmUrl = (obj: any): string | null => {
      if (!obj) return null;
      if (typeof obj === "string") return null; // ambiguous
      if (obj.watermark) return obj.watermark;
      if (obj.wmplay) return obj.wmplay;
      return null;
    };

    const videoObj = result.video || result;
    const videoHdObj = result.video_hd || result.hd || null;

    return {
      status: true,
      video: getVideoUrl(videoObj),
      video_hd: getVideoHdUrl(videoHdObj) || getVideoUrl(videoObj), // fallback ke SD kalau HD tidak ada
      wm: getWmUrl(videoObj),
      audio: typeof result.audio === "string" ? result.audio : null,
      images: Array.isArray(result.images) ? result.images : [],
      author: result.author?.nickname || result.author?.username || "-",
      desc: result.title || result.desc || "-",
      cover: result.cover || undefined,
    };
  } catch (error) {
    const err = error as AxiosError;
    console.warn("[TiklyDown] Error:", err.message || err.code);
    return null;
  }
}

// ─── RETRY WRAPPER ───────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T | null>,
  retries = 3,
  delayMs = 1200
): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (result && (result as any).status) return result;
    } catch {
      // silent
    }
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  return null;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
export const downloadTikTok = async (url: string): Promise<TikTokResult> => {
  // 1. Coba TikWM dulu (biasanya paling cepat & lengkap)
  let result = await withRetry(() => fetchFromTikWM(url), 3, 1200);

  // 2. Fallback ke TiklyDown kalau TikWM gagal
  if (!result || !result.video) {
    console.log("[Fallback] TikWM gagal, mencoba TiklyDown...");
    result = await withRetry(() => fetchFromTiklyDown(url), 3, 1200);
  }

  if (result && result.status && (result.video || result.images.length > 0)) {
    return result;
  }

  // 3. Semua source gagal
  return {
    status: false,
    video: null,
    video_hd: null,
    wm: null,
    audio: null,
    images: [],
    author: "-",
    desc: "-",
  };
};

export const isValidTikTokUrl = (url: string): boolean => {
  const tiktokRegex =
    /^https?:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\/.+/i;
  return tiktokRegex.test(url);
};

// ─── HELPER: Cek apakah post adalah slideshow ────────────────
export const isSlideshow = (result: TikTokResult): boolean => {
  return result.images.length > 0;
};

// ─── HELPER: Cek apakah video tersedia ───────────────────────
export const hasVideo = (result: TikTokResult): boolean => {
  return !!result.video || !!result.video_hd;
};
