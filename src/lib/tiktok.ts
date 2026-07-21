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
  coverAnimated?: string;
  duration?: number;
  originalUrl?: string;
}

/* ============================================================
   HELPERS — Super Robust URL Extraction
   ============================================================ */

function resolveUrl(input: unknown, host?: string): string | null {
  if (!input) return null;

  // String langsung
  if (typeof input === "string") {
    if (input.startsWith("http")) return input;
    if (host) return host + input;
    return null;
  }

  // Array → ambil first valid string
  if (Array.isArray(input)) {
    for (const item of input) {
      const resolved = resolveUrl(item, host);
      if (resolved) return resolved;
    }
    return null;
  }

  // Object → cari field url/play/download
  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;
    const keys = ["url", "playUrl", "play_url", "downloadAddr", "uri", "src", "link"];
    for (const key of keys) {
      if (obj[key]) {
        const resolved = resolveUrl(obj[key], host);
        if (resolved) return resolved;
      }
    }
  }

  return null;
}

// ─── OEMBED THUMBNAIL FALLBACK ─────────────────────────────
async function getOEmbedThumbnail(originalUrl: string): Promise<string | null> {
  try {
    const res = await axios.get("https://www.tiktok.com/oembed", {
      params: { url: originalUrl },
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const thumbnail = res.data?.thumbnail_url;
    if (thumbnail && typeof thumbnail === "string" && thumbnail.startsWith("http")) {
      return thumbnail;
    }
    return null;
  } catch (error) {
    console.warn("[oEmbed] Failed:", (error as AxiosError).message);
    return null;
  }
}

/* ============================================================
   SOURCE 1: TIKWM (PRIMARY — PALING LENGKAP)
   ============================================================ */

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
        params: { url, count: 12, cursor: 0, web: 1, hd: 1 },
        timeout: 15000,
      }
    );

    const data = res.data?.data;
    if (!data) {
      console.warn("[TikWM] No data field");
      return null;
    }

    // ─── VIDEOS (handle string, array, object) ──────────────
    const videoUrl = resolveUrl(data.play, host);
    const videoHd = resolveUrl(data.hdplay, host) || resolveUrl(data.hd_play, host);
    const wmUrl = resolveUrl(data.wmplay, host) || resolveUrl(data.wm_play, host);

    // ─── AUDIO ──────────────────────────────────────────────
    const audio = resolveUrl(data.music, host);

    // ─── COVER STATIC ───────────────────────────────────────
    const cover = resolveUrl(data.cover, host) || resolveUrl(data.thumbnail, host);

    // ─── COVER ANIMATED (GIF/WEBP) — origin_cover biasanya animated ──
    const coverAnimated = resolveUrl(data.origin_cover, host) || resolveUrl(data.dynamic_cover, host);

    // ─── IMAGES (SLIDESHOW) ─────────────────────────────────
    const images: string[] = [];
    if (Array.isArray(data.images)) {
      for (const img of data.images) {
        const resolved = resolveUrl(img, host);
        if (resolved) images.push(resolved);
      }
    }

    console.log("[TikWM] video:", !!videoUrl, "hd:", !!videoHd, "wm:", !!wmUrl, "audio:", !!audio, "cover:", !!cover, "animated:", !!coverAnimated);

    if (!videoUrl && images.length === 0) {
      console.warn("[TikWM] No video and no images");
      return null;
    }

    return {
      status: true,
      video: videoUrl,
      video_hd: videoHd,
      wm: wmUrl,
      audio,
      images,
      author: data.author?.nickname || data.author?.unique_id || "-",
      desc: data.title || "-",
      cover: cover || undefined,
      coverAnimated: coverAnimated || undefined,
      duration: data.duration,
      originalUrl: url,
    };
  } catch (error) {
    console.warn("[TikWM] Error:", (error as AxiosError).message);
    return null;
  }
}

/* ============================================================
   SOURCE 2: TIKLYDOWN (FALLBACK)
   ============================================================ */

async function fetchFromTiklyDown(url: string): Promise<TikTokResult | null> {
  try {
    const res = await axios.get("https://api.tiklydown.eu.org/api/download", {
      params: { url },
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const d = res.data;
    if (!d || d.status === "error" || d.status === false) return null;

    const result = d.result || d;
    const videoObj = result.video || result;

    const videoUrl = resolveUrl(videoObj, undefined, "noWatermark", "play", "url", "download");
    const videoHd = resolveUrl(videoObj, undefined, "hd", "hdplay", "hd_play");
    const wmUrl = resolveUrl(videoObj, undefined, "watermark", "wm", "wmplay");

    let audioUrl: string | null = null;
    if (typeof result.audio === "string") audioUrl = result.audio;
    else if (result.audio && typeof result.audio === "object") {
      audioUrl = result.audio.url || result.audio.playUrl || null;
    }
    if (!audioUrl && result.music) {
      audioUrl = typeof result.music === "string" ? result.music : result.music.url || null;
    }

    // Cover
    let cover: string | null = null;
    const candidates = [
      result.cover, result.thumbnail, result.thumb,
      result.video?.cover, result.video?.thumbnail, result.video?.originCover,
    ];
    for (const c of candidates) {
      if (c && typeof c === "string" && c.startsWith("http")) {
        cover = c;
        break;
      }
    }

    return {
      status: true,
      video: videoUrl,
      video_hd: videoHd,
      wm: wmUrl,
      audio: audioUrl,
      images: Array.isArray(result.images) ? result.images : [],
      author: result.author?.nickname || result.author?.username || "-",
      desc: result.title || result.desc || "-",
      cover: cover || undefined,
      originalUrl: url,
    };
  } catch (error) {
    console.warn("[TiklyDown] Error:", (error as AxiosError).message);
    return null;
  }
}

/* ============================================================
   RETRY WRAPPER
   ============================================================ */

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

/* ============================================================
   MAIN EXPORT — TikWM Primary, TiklyDown Fallback
   ============================================================ */

export const downloadTikTok = async (url: string): Promise<TikTokResult> => {
  console.log("[Download] URL:", url);

  // PRIMARY: TikWM (paling lengkap — HD, WM, animated cover)
  let result = await withRetry(() => fetchFromTikWM(url), 3, 1500);

  // FALLBACK: TiklyDown kalau TikWM gagal total
  if (!result || !result.video) {
    console.log("[Main] TikWM failed, fallback to TiklyDown...");
    result = await withRetry(() => fetchFromTiklyDown(url), 2, 1200);
  }

  // THUMBNAIL FALLBACK CHAIN
  if (result && result.status) {
    const originalUrl = result.originalUrl || url;

    // Kalau masih nggak ada cover sama sekali, coba oEmbed
    if (!result.cover && !result.coverAnimated) {
      const oEmbedThumb = await getOEmbedThumbnail(originalUrl);
      if (oEmbedThumb) result.cover = oEmbedThumb;
    }

    // Kalau slideshow tapi nggak ada cover, pakai image pertama
    if (!result.cover && !result.coverAnimated && result.images.length > 0) {
      result.cover = result.images[0];
    }
  }

  if (result && result.status && (result.video || result.images.length > 0)) {
    console.log("[Download] SUCCESS — video:", !!result.video, "hd:", !!result.video_hd, "wm:", !!result.wm, "cover:", !!result.cover);
    return result;
  }

  console.error("[Download] ALL SOURCES FAILED");
  return {
    status: false,
    video: null,
    video_hd: null,
    wm: null,
    audio: null,
    images: [],
    author: "-",
    desc: "-",
    originalUrl: url,
  };
};

/* ============================================================
   UTILS
   ============================================================ */

export const isValidTikTokUrl = (url: string): boolean => {
  const tiktokRegex = /^https?:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\/.+/i;
  return tiktokRegex.test(url);
};

export const isSlideshow = (result: TikTokResult): boolean => result.images.length > 0;
export const hasVideo = (result: TikTokResult): boolean => !!result.video;

export function generateFileName(prefix: string, ext: string): string {
  return `${prefix}_${Date.now()}.${ext}`;
}
