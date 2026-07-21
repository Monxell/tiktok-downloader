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
  quality?: string;
}

/* ============================================================
   MULTI-SOURCE TIKTOK DOWNLOADER
   - Source 1: TiklyDown (primary) — biasanya lebih reliable
   - Source 2: SSSTik-style API (secondary)
   - Source 3: TikWM (fallback terakhir) — sering URL duplikat
   ============================================================ */

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u = url.trim();
  if (u.startsWith("//")) u = "https:" + u;
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return u;
  }
}

function isSameUrl(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return normalizeUrl(a) === normalizeUrl(b);
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

    const rawVideo = getUrl(videoObj, "noWatermark") || getUrl(videoObj, "url");
    const rawVideoHd = getUrl(result.video_hd || result.hd, "url") || getUrl(result.hd, "hd");
    const rawWm = getUrl(videoObj, "watermark") || getUrl(videoObj, "wmplay");
    const rawAudio = typeof result.audio === "string" ? result.audio : getUrl(result.audio, "url");

    const video_hd = (rawVideoHd && !isSameUrl(rawVideoHd, rawVideo)) ? rawVideoHd : null;
    const wm = (rawWm && !isSameUrl(rawWm, rawVideo)) ? rawWm : null;

    console.log("[TiklyDown] URLs:", { video: rawVideo, hd: rawVideoHd, wm: rawWm, deduped_hd: video_hd, deduped_wm: wm });

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
      quality: video_hd ? "HD" : rawVideo ? "SD" : undefined,
    };
  } catch (error) {
    console.warn("[TiklyDown] Error:", (error as AxiosError).message);
    return null;
  }
}

// ─── SOURCE 2: SSSTIK-STYLE API ─────────────────────────────
async function fetchFromSSSTik(url: string): Promise<TikTokResult | null> {
  try {
    const res = await axios.post(
      "https://api.ssstik.io/api/v1/convert",
      { id: url },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 15000,
      }
    );

    const d = res.data;
    if (!d || d.error) return null;

    const videoUrl = d.video?.url || d.videoUrl || d.url || null;
    const videoHdUrl = d.video?.hd?.url || d.videoHd || d.hdUrl || null;
    const wmUrl = d.video?.wm?.url || d.videoWm || d.wmUrl || null;
    const audioUrl = d.audio?.url || d.music?.url || d.audioUrl || null;

    const video_hd = (videoHdUrl && !isSameUrl(videoHdUrl, videoUrl)) ? videoHdUrl : null;
    const wm = (wmUrl && !isSameUrl(wmUrl, videoUrl)) ? wmUrl : null;

    console.log("[SSSTik] URLs:", { video: videoUrl, hd: videoHdUrl, wm: wmUrl, deduped_hd: video_hd, deduped_wm: wm });

    return {
      status: true,
      video: videoUrl,
      video_hd: video_hd,
      wm: wm,
      audio: audioUrl,
      images: Array.isArray(d.images) ? d.images : [],
      author: d.author?.nickname || d.author?.name || "-",
      desc: d.desc || d.title || "-",
      cover: d.cover || d.thumbnail || undefined,
      quality: video_hd ? "HD" : videoUrl ? "SD" : undefined,
    };
  } catch (error) {
    console.warn("[SSSTik] Error:", (error as AxiosError).message);
    return null;
  }
}

// ─── SOURCE 3: TIKWM (FALLBACK TERAKHIR) ────────────────────
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

    const formatUrl = (path: string | undefined): string | null => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      return host + path;
    };

    const rawVideo = formatUrl(data.play);
    const rawVideoHd = formatUrl(data.hdplay);
    const rawWm = formatUrl(data.wmplay);
    const rawAudio = formatUrl(data.music);

    const video_hd = (rawVideoHd && !isSameUrl(rawVideoHd, rawVideo)) ? rawVideoHd : null;
    const wm = (rawWm && !isSameUrl(rawWm, rawVideo)) ? rawWm : null;

    console.log("[TikWM] URLs:", { play: rawVideo, hdplay: rawVideoHd, wmplay: rawWm, deduped_hd: video_hd, deduped_wm: wm });

    return {
      status: true,
      video: rawVideo,
      video_hd: video_hd,
      wm: wm,
      audio: rawAudio,
      images: Array.isArray(data.images) ? data.images.map((img: string) => img.startsWith("http") ? img : host + img) : [],
      author: data.author?.nickname || data.author?.unique_id || "-",
      desc: data.title || "-",
      cover: data.origin_cover || data.cover || undefined,
      duration: data.duration,
      quality: video_hd ? "HD" : rawVideo ? "SD" : undefined,
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
  // 1. Coba TiklyDown dulu (primary)
  let result = await withRetry(() => fetchFromTiklyDown(url), 3, 1200);

  // 2. Fallback ke SSSTik-style
  if (!result || !result.video) {
    console.log("[Fallback] TiklyDown gagal, mencoba SSSTik...");
    result = await withRetry(() => fetchFromSSSTik(url), 2, 1500);
  }

  // 3. Fallback terakhir ke TikWM
  if (!result || !result.video) {
    console.log("[Fallback] SSSTik gagal, mencoba TikWM (fallback terakhir)...");
    result = await withRetry(() => fetchFromTikWM(url), 2, 1500);
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
export const hasVideo = (result: TikTokResult): boolean => !!result.video || !!result.video_hd;
