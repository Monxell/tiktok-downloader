import axios, { AxiosError } from "axios";

export interface TikTokResult {
  status: boolean;
  video: string | null;      // Video Tanpa Watermark (SD)
  video_hd: string | null;   // Video Tanpa Watermark HD
  wm: string | null;         // Video Dengan Watermark
  audio: string | null;      // Audio Only
  images: string[];          // Slideshow Images
  author: string;
  desc: string;
  cover?: string;
}

/* ============================================================
   MULTI-SOURCE TIKTOK DOWNLOADER
   - Source 1: TikWM (primary)
   - Source 2: TiklyDown (fallback)
   - Smart URL deduplication: kalau HD/WM URL sama dengan SD,
     dianggap tidak tersedia (null)
   ============================================================ */

// ─── HELPER: Normalize & compare URLs ───────────────────────
function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u = url.trim();
  if (u.startsWith("//")) u = "https:" + u;
  // Remove query params for comparison (sometimes same file, different params)
  try {
    const parsed = new URL(u);
    // TikWM sometimes adds ?h=xxx or ?s=xxx to same file
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return u;
  }
}

function isSameUrl(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return normalizeUrl(a) === normalizeUrl(b);
}

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
    if (!data) {
      console.warn("[TikWM] No data in response");
      return null;
    }

    const formatUrl = (path: string | undefined): string | null => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      return host + path;
    };

    const rawVideo = formatUrl(data.play);
    const rawVideoHd = formatUrl(data.hdplay);
    const rawWm = formatUrl(data.wmplay);
    const rawAudio = formatUrl(data.music);

    // ─── DEDUPLICATION LOGIC ──────────────────────────────
    // Kalau HD URL sama dengan SD → HD tidak tersedia (bukan HD beneran)
    const video_hd = (rawVideoHd && !isSameUrl(rawVideoHd, rawVideo)) ? rawVideoHd : null;

    // Kalau WM URL sama dengan No WM → WM tidak tersedia (URL salah)
    const wm = (rawWm && !isSameUrl(rawWm, rawVideo)) ? rawWm : null;

    // Log untuk debug (bisa dilihat di browser console)
    console.log("[TikWM] URLs:", {
      play: rawVideo,
      hdplay: rawVideoHd,
      wmplay: rawWm,
      deduped_hd: video_hd,
      deduped_wm: wm,
    });

    return {
      status: true,
      video: rawVideo,
      video_hd: video_hd,
      wm: wm,
      audio: rawAudio,
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

// ─── SOURCE 2: TIKLYDOWN ───────────────────────────────────
async function fetchFromTiklyDown(url: string): Promise<TikTokResult | null> {
  try {
    const res = await axios.get("https://api.tiklydown.eu.org/api/download", {
      params: { url },
      timeout: 15000,
      headers: { Accept: "application/json" },
    });

    const d = res.data;
    if (!d || d.status === "error") return null;

    const result = d.result || d;

    const getVideoUrl = (obj: any): string | null => {
      if (!obj) return null;
      if (typeof obj === "string") return obj;
      if (obj.noWatermark) return obj.noWatermark;
      if (obj.url) return obj.url;
      return null;
    };

    const getVideoHdUrl = (obj: any): string | null => {
      if (!obj) return null;
      if (typeof obj === "string") return null;
      if (obj.hd) return obj.hd;
      if (obj.hdplay) return obj.hdplay;
      return null;
    };

    const getWmUrl = (obj: any): string | null => {
      if (!obj) return null;
      if (typeof obj === "string") return null;
      if (obj.watermark) return obj.watermark;
      if (obj.wmplay) return obj.wmplay;
      return null;
    };

    const videoObj = result.video || result;
    const videoHdObj = result.video_hd || result.hd || null;

    const rawVideo = getVideoUrl(videoObj);
    const rawVideoHd = getVideoHdUrl(videoHdObj);
    const rawWm = getWmUrl(videoObj);
    const rawAudio = typeof result.audio === "string" ? result.audio : null;

    // Deduplication
    const video_hd = (rawVideoHd && !isSameUrl(rawVideoHd, rawVideo)) ? rawVideoHd : null;
    const wm = (rawWm && !isSameUrl(rawWm, rawVideo)) ? rawWm : null;

    console.log("[TiklyDown] URLs:", {
      video: rawVideo,
      hd: rawVideoHd,
      wm: rawWm,
      deduped_hd: video_hd,
      deduped_wm: wm,
    });

    return {
      status: true,
      video: rawVideo,
      video_hd: video_hd,
      wm: wm,
      audio: rawAudio,
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
  let result = await withRetry(() => fetchFromTikWM(url), 3, 1200);

  if (!result || !result.video) {
    console.log("[Fallback] TikWM gagal / tidak ada video, mencoba TiklyDown...");
    result = await withRetry(() => fetchFromTiklyDown(url), 3, 1200);
  }

  if (result && result.status && (result.video || result.images.length > 0)) {
    return result;
  }

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

export const isSlideshow = (result: TikTokResult): boolean => {
  return result.images.length > 0;
};

export const hasVideo = (result: TikTokResult): boolean => {
  return !!result.video || !!result.video_hd;
};
