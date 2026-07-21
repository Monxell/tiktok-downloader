import axios, { AxiosError } from "axios";

export interface TikTokResult {
  status: boolean;
  video: string | null;      // No Watermark (SD)
  video_hd: string | null;   // No Watermark HD
  wm: string | null;         // With Watermark
  audio: string | null;
  images: string[];
  author: string;
  desc: string;
  cover?: string;            // Static cover
  coverAnimated?: string;    // GIF/animated cover (origin_cover/dynamic_cover)
  duration?: number;
  originalUrl?: string;
}

/* ============================================================
   HELPERS
   ============================================================ */

function formatUrl(path: string | string[] | undefined, host: string): string | null {
  if (!path) return null;
  const urlStr = Array.isArray(path) ? path[0] : path;
  if (!urlStr || typeof urlStr !== "string") return null;
  if (urlStr.startsWith("http")) return urlStr;
  return host + urlStr;
}

function pickFirstUrl(obj: any, ...keys: string[]): string | null {
  if (!obj) return null;
  if (typeof obj === "string") return obj.startsWith("http") ? obj : null;
  for (const key of keys) {
    const val = obj[key];
    if (!val) continue;
    if (typeof val === "string") {
      if (val.startsWith("http")) return val;
      continue;
    }
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
      if (val[0].startsWith("http")) return val[0];
    }
    if (typeof val === "object") {
      const nested = pickFirstUrl(val, "url", "playUrl", "play_url", "downloadAddr", "uri");
      if (nested) return nested;
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
   SOURCE 1: TIKLYDOWN (PRIMARY)
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

    const videoUrl = pickFirstUrl(videoObj, "noWatermark", "play", "url", "download");
    const videoHd = pickFirstUrl(videoObj, "hd", "hdplay", "hd_play");
    const wmUrl = pickFirstUrl(videoObj, "watermark", "wm", "wmplay", "wm_play");

    let audioUrl: string | null = null;
    if (typeof result.audio === "string") audioUrl = result.audio;
    else if (result.audio && typeof result.audio === "object") {
      audioUrl = result.audio.url || result.audio.playUrl || result.audio.music || null;
    }
    if (!audioUrl && result.music) {
      audioUrl = typeof result.music === "string" ? result.music : result.music.url || result.music.playUrl || null;
    }

    // Cover extraction (static)
    let cover: string | null = null;
    const coverCandidates = [
      result.cover, result.thumbnail, result.thumb, result.image,
      result.video?.cover, result.video?.thumbnail, result.video?.originCover,
      result.video?.dynamicCover, result.video?.origin_cover,
    ];
    for (const c of coverCandidates) {
      if (c && typeof c === "string" && c.startsWith("http")) {
        cover = c;
        break;
      }
      if (Array.isArray(c) && c[0] && typeof c[0] === "string" && c[0].startsWith("http")) {
        cover = c[0];
        break;
      }
    }

    // Animated cover
    let coverAnimated: string | null = null;
    const animatedCandidates = [
      result.origin_cover, result.dynamic_cover, result.video?.origin_cover,
      result.video?.dynamic_cover, result.video?.ai_dynamic_cover,
    ];
    for (const c of animatedCandidates) {
      if (c && typeof c === "string" && c.startsWith("http")) {
        coverAnimated = c;
        break;
      }
      if (Array.isArray(c) && c[0] && typeof c[0] === "string" && c[0].startsWith("http")) {
        coverAnimated = c[0];
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
      coverAnimated: coverAnimated || undefined,
      originalUrl: url,
    };
  } catch (error) {
    console.warn("[TiklyDown] Error:", (error as AxiosError).message);
    return null;
  }
}

/* ============================================================
   SOURCE 2: TIKWM (FALLBACK — PALING LENGKAP)
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
      console.warn("[TikWM] No data");
      return null;
    }

    // ─── VIDEOS ───────────────────────────────────────────
    const videoUrl = formatUrl(data.play, host);
    const videoHd = formatUrl(data.hdplay, host) || formatUrl(data.hd_play, host);
    const wmUrl = formatUrl(data.wmplay, host) || formatUrl(data.wm_play, host);

    // ─── AUDIO ────────────────────────────────────────────
    let audio: string | null = null;
       if (data.music) {
      if (typeof data.music === "string") {
        audio = data.music.startsWith("http") ? data.music : host + data.music;
      } else if (typeof data.music === "object") {
        audio = data.music.url || data.music.playUrl || data.music.play_url || null;
        if (audio && !audio.startsWith("http")) audio = host + audio;
      }
    }

    // ─── COVER STATIC ─────────────────────────────────────
    let cover: string | null = null;
    const coverSources = [data.cover, data.origin_cover, data.dynamic_cover, data.thumbnail];
    for (const src of coverSources) {
      const formatted = formatUrl(src, host);
      if (formatted) { cover = formatted; break; }
    }

    // ─── COVER ANIMATED (GIF/WEBP) ────────────────────────
    // TikWM: origin_cover atau dynamic_cover biasanya animated
    let coverAnimated: string | null = null;
    const animatedSources = [
      data.origin_cover,      // Ini yang biasanya GIF/animated di TikWM
      data.dynamic_cover,
      data.ai_dynamic_cover,
    ];
    for (const src of animatedSources) {
      const formatted = formatUrl(src, host);
      if (formatted) { coverAnimated = formatted; break; }
    }

    // ─── IMAGES (SLIDESHOW) ───────────────────────────────
    const images: string[] = [];
    if (Array.isArray(data.images)) {
      for (const img of data.images) {
        const imgStr = Array.isArray(img) ? img[0] : img;
        if (typeof imgStr === "string") {
          images.push(imgStr.startsWith("http") ? imgStr : host + imgStr);
        }
      }
    }

    console.log("[TikWM] OK — video:", !!videoUrl, "hd:", !!videoHd, "wm:", !!wmUrl, "audio:", !!audio, "animated:", !!coverAnimated);

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
   MAIN EXPORT
   ============================================================ */

export const downloadTikTok = async (url: string): Promise<TikTokResult> => {
  // Coba TiklyDown dulu
  let result = await withRetry(() => fetchFromTiklyDown(url), 2, 1200);

  // Fallback ke TikWM (yang paling lengkap)
  if (!result || !result.video) {
    console.log("[Main] Fallback to TikWM...");
    result = await withRetry(() => fetchFromTikWM(url), 3, 1500);
  }

  // Thumbnail fallback chain
  if (result && result.status) {
    const originalUrl = result.originalUrl || url;

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
