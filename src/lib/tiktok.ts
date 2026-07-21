import axios, { AxiosError } from "axios";

export interface TikTokResult {
  status: boolean;
  video: string | null;
  video_hd: string | null;
  wm: string | null;
  audio: string | null;
  images: string[];
  author: string;
  desc: string;
  cover?: string;
  duration?: number;
}

/* ============================================================
   MULTI-SOURCE TIKTOK DOWNLOADER
   ============================================================ */

function formatUrl(path: string | undefined, host: string): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return host + path;
}

// ─── SOURCE 1: TIKLYDOWN (PRIMARY) ───────────────────────────
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
    const videoObj = result.video || result;

    const getUrl = (obj: any, key: string): string | null => {
      if (!obj) return null;
      if (typeof obj === "string") return obj;
      return obj[key] || obj.url || null;
    };

    const videoUrl = getUrl(videoObj, "noWatermark") || getUrl(videoObj, "url");
    const audioUrl = typeof result.audio === "string" ? result.audio : getUrl(result.audio, "url");

    let cover = result.cover || result.thumbnail || null;
    if (cover && !cover.startsWith("http")) cover = null;

    return {
      status: true,
      video: videoUrl,
      video_hd: null,
      wm: null,
      audio: audioUrl,
      images: Array.isArray(result.images) ? result.images : [],
      author: result.author?.nickname || result.author?.username || "-",
      desc: result.title || result.desc || "-",
      cover: cover || undefined,
    };
  } catch (error) {
    console.warn("[TiklyDown] Error:", (error as AxiosError).message);
    return null;
  }
}

// ─── SOURCE 2: TIKWM (FALLBACK) ──────────────────────────────
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
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        params: { url: url, count: 12, cursor: 0, web: 1, hd: 1 },
        timeout: 15000,
      }
    );

    const data = res.data?.data;
    if (!data) return null;

    let cover: string | undefined = undefined;
    if (data.origin_cover) cover = formatUrl(data.origin_cover, host) || undefined;
    if (!cover && data.cover) cover = formatUrl(data.cover, host) || undefined;
    if (!cover && data.dynamic_cover) cover = formatUrl(data.dynamic_cover, host) || undefined;
    if (!cover && data.author?.avatar) cover = formatUrl(data.author.avatar, host) || undefined;

    return {
      status: true,
      video: formatUrl(data.play, host),
      video_hd: null,
      wm: null,
      audio: formatUrl(data.music, host),
      images: Array.isArray(data.images) 
        ? data.images.map((img: string) => img.startsWith("http") ? img : host + img) 
        : [],
      author: data.author?.nickname || data.author?.unique_id || "-",
      desc: data.title || "-",
      cover: cover,
      duration: data.duration,
    };
  } catch (error) {
    console.warn("[TikWM] Error:", (error as AxiosError).message);
    return null;
  }
}

// ─── RETRY WRAPPER ───────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T | null>, retries = 3, delayMs = 1200): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (result && (result as any).status) return result;
    } catch {}
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
  }
  return null;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
export const downloadTikTok = async (url: string): Promise<TikTokResult> => {
  let result = await withRetry(() => fetchFromTiklyDown(url), 3, 1200);

  if (!result || !result.video) {
    console.log("[Fallback] TiklyDown gagal, mencoba TikWM...");
    result = await withRetry(() => fetchFromTikWM(url), 3, 1500);
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
  const tiktokRegex = /^https?:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\/.+/i;
  return tiktokRegex.test(url);
};

export const isSlideshow = (result: TikTokResult): boolean => result.images.length > 0;
export const hasVideo = (result: TikTokResult): boolean => !!result.video;

// ─── HELPER: Generate simple filename ───────────────────────
export function generateFileName(
  prefix: string,
  ext: string
): string {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.${ext}`;
}
