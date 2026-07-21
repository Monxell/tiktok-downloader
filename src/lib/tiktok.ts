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
  originalUrl?: string;
}

/* ============================================================
   HELPERS
   ============================================================ */

function formatUrl(path: string | string[] | undefined, host: string): string | null {
  if (!path) return null;
  const urlStr = Array.isArray(path) ? path[0] : path;
  if (!urlStr) return null;
  if (urlStr.startsWith("http")) return urlStr;
  return host + urlStr;
}

function extractVideoId(url: string): string | null {
  // Pattern: /video/1234567890 atau /v/1234567890
  const match = url.match(/\/(?:video|v)\/(\d+)/);
  if (match?.[1]) return match[1];

  // Pattern: vm.tiktok.com/AbCdEfG/ redirect (short URL)
  // Pattern: vt.tiktok.com/AbCdEfG/
  // Untuk short URL, ID ada di redirect, tapi di sini kita coba extract dari URL panjang
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
      console.log("[oEmbed] Thumbnail found:", thumbnail.substring(0, 80));
      return thumbnail;
    }
    return null;
  } catch (error) {
    console.warn("[oEmbed] Failed:", (error as AxiosError).message);
    return null;
  }
}

// ─── TIKTOK CDN DIRECT THUMBNAIL FALLBACK ──────────────────
function getTikTokCdnThumbnail(videoId: string): string | null {
  if (!videoId || videoId.length < 10) return null;
  // TikTok CDN thumbnail patterns ( beberapa masih work )
  const patterns = [
    `https://p16-sign.tiktokcdn-us.com/obj/tos-useast5-p-0068-tx/${videoId}`,
    `https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/${videoId}`,
    `https://p19-sign.tiktokcdn-us.com/obj/tos-useast5-p-0068-tx/${videoId}`,
  ];
  // Return first pattern as best guess
  return patterns[0] || null;
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
    if (!d || d.status === "error" || d.status === false) {
      console.warn("[TiklyDown] API returned error status");
      return null;
    }

    const result = d.result || d;
    const videoObj = result.video || result;

    const getUrl = (obj: any, ...keys: string[]): string | null => {
      if (!obj) return null;
      if (typeof obj === "string") return obj;
      for (const key of keys) {
        if (obj[key]) {
          if (typeof obj[key] === "string") return obj[key];
          if (Array.isArray(obj[key]) && obj[key].length > 0) return obj[key][0];
        }
      }
      return obj.url || null;
    };

    const videoUrl = getUrl(videoObj, "noWatermark", "play", "url", "download");

    // ─── AUDIO EXTRACTION ─────────────────────────────────
    let audioUrl: string | null = null;
    if (typeof result.audio === "string") audioUrl = result.audio;
    else if (result.audio && typeof result.audio === "object") {
      audioUrl = result.audio.url || result.audio.playUrl || result.audio.music || result.audio.downloadAddr || null;
    }
    if (!audioUrl && result.music) {
      if (typeof result.music === "string") audioUrl = result.music;
      else if (typeof result.music === "object") {
        audioUrl = result.music.url || result.music.playUrl || result.music.downloadAddr || null;
      }
    }

    // ─── COVER EXTRACTION (ENHANCED) ──────────────────────
    let cover: string | null = null;

    // Deep extraction helper
    const extractDeep = (obj: any, path: string): any => {
      return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    };

    const coverCandidates = [
      // Direct fields
      result.cover,
      result.thumbnail,
      result.thumb,
      result.image,
      result.thumbnail_url,
      result.thumbnailUrl,
      // Nested video object
      result.video?.cover,
      result.video?.thumbnail,
      result.video?.thumb,
      result.video?.originCover,
      result.video?.origin_cover,
      result.video?.dynamicCover,
      result.video?.dynamic_cover,
      result.video?.ai_dynamic_cover,
      result.video?.aiDynamicCover,
      result.video?.cover_image,
      result.video?.coverImage,
      // Deep nested
      extractDeep(result, "video.play_addr.url_list.0"),
      extractDeep(result, "video.download_addr.url_list.0"),
      extractDeep(result, "video.bitrateInfo.0.play_addr.url_list.0"),
      extractDeep(result, "video.originCover.url_list.0"),
      extractDeep(result, "video.dynamicCover.url_list.0"),
      // Author avatar as last resort
      result.author?.avatar,
      result.author?.avatar_thumb,
      result.author?.avatar_medium,
    ];

    for (const candidate of coverCandidates) {
      if (candidate) {
        const val = typeof candidate === "string" ? candidate : Array.isArray(candidate) ? candidate[0] : null;
        if (val && val.startsWith("http")) {
          cover = val;
          break;
        }
      }
    }

    // If cover found but not full URL, try to complete it
    if (cover && !cover.startsWith("http")) {
      cover = "https:" + cover;
    }

    console.log("[TiklyDown] Extracted:", {
      video: videoUrl ? "YES" : "NO",
      audio: audioUrl ? "YES" : "NO",
      cover: cover ? cover.substring(0, 60) + "..." : "NONE",
    });

    return {
      status: true,
      video: videoUrl,
      video_hd: getUrl(videoObj, "hd", "hdplay") || null,
      wm: getUrl(videoObj, "watermark", "wm") || null,
      audio: audioUrl,
      images: Array.isArray(result.images) ? result.images : [],
      author: result.author?.nickname || result.author?.username || result.author?.uniqueId || "-",
      desc: result.title || result.desc || result.description || "-",
      cover: cover || undefined,
      originalUrl: url,
    };
  } catch (error) {
    console.warn("[TiklyDown] Error:", (error as AxiosError).message);
    return null;
  }
}

/* ============================================================
   SOURCE 2: TIKWM (FALLBACK)
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
        params: { url: url, count: 12, cursor: 0, web: 1, hd: 1 },
        timeout: 15000,
      }
    );

    const data = res.data?.data;
    if (!data) {
      console.warn("[TikWM] No data in response");
      return null;
    }

    // ─── COVER EXTRACTION (ENHANCED) ──────────────────────
    let cover: string | null = null;
    const coverSources = [
      data.origin_cover,
      data.cover,
      data.dynamic_cover,
      data.ai_dynamic_cover,
      data.thumbnail,
      data.thumb,
      data.video?.cover,
      data.video?.origin_cover,
      data.video?.dynamic_cover,
      data.author?.avatar,
      data.author?.avatar_thumb,
    ];

    for (const src of coverSources) {
      if (!src) continue;
      const formatted = formatUrl(src, host);
      if (formatted) {
        cover = formatted;
        break;
      }
    }

    // ─── AUDIO EXTRACTION ─────────────────────────────────
    let audio: string | null = null;
    if (data.music) {
      if (typeof data.music === "string") {
        audio = data.music.startsWith("http") ? data.music : host + data.music;
      } else if (typeof data.music === "object") {
        audio = data.music.url || data.music.playUrl || data.music.play_url || null;
        if (audio && !audio.startsWith("http")) audio = host + audio;
      }
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

    console.log("[TikWM] Extracted:", {
      video: data.play ? "YES" : "NO",
      audio: audio ? "YES" : "NO",
      cover: cover ? cover.substring(0, 60) + "..." : "NONE",
      images: images.length,
    });

    return {
      status: true,
      video: formatUrl(data.play, host),
      video_hd: formatUrl(data.hdplay, host) || formatUrl(data.hd_play, host) || null,
      wm: formatUrl(data.wmplay, host) || null,
      audio: audio,
      images,
      author: data.author?.nickname || data.author?.unique_id || data.author?.id || "-",
      desc: data.title || "-",
      cover: cover || undefined,
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
      console.log(`[Retry] Attempt ${i + 1} failed, retrying...`);
    } catch (err) {
      console.log(`[Retry] Attempt ${i + 1} error:`, (err as Error).message);
    }
    if (i < retries - 1) {
      const delay = delayMs * (i + 1);
      console.log(`[Retry] Waiting ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return null;
}

/* ============================================================
   MAIN EXPORT
   ============================================================ */

export const downloadTikTok = async (url: string): Promise<TikTokResult> => {
  console.log("[Download] Starting for URL:", url);

  // ─── SOURCE 1: TIKLYDOWN ───────────────────────────────
  let result = await withRetry(() => fetchFromTiklyDown(url), 3, 1200);

  // ─── SOURCE 2: TIKWM (FALLBACK) ────────────────────────
  if (!result || !result.video) {
    console.log("[Fallback] TiklyDown failed or no video, trying TikWM...");
    result = await withRetry(() => fetchFromTikWM(url), 3, 1500);
  }

  // ─── THUMBNAIL FALLBACK CHAIN ──────────────────────────
  if (result && result.status) {
    const originalUrl = result.originalUrl || url;

    // Fallback 1: oEmbed
    if (!result.cover) {
      console.log("[Thumbnail] API cover empty, trying oEmbed...");
      const oEmbedThumb = await getOEmbedThumbnail(originalUrl);
      if (oEmbedThumb) {
        result.cover = oEmbedThumb;
        console.log("[Thumbnail] oEmbed success");
      }
    }

    // Fallback 2: TikTok CDN direct (extract video ID)
    if (!result.cover) {
      const videoId = extractVideoId(originalUrl);
      if (videoId) {
        const cdnThumb = getTikTokCdnThumbnail(videoId);
        if (cdnThumb) {
          result.cover = cdnThumb;
          console.log("[Thumbnail] CDN fallback:", cdnThumb.substring(0, 60));
        }
      }
    }

    // Fallback 3: Kalau slideshow, pakai image pertama sebagai cover
    if (!result.cover && result.images.length > 0) {
      result.cover = result.images[0];
      console.log("[Thumbnail] Using first slideshow image as cover");
    }

    // Fallback 4: Kalau ada video tapi nggak ada cover sama sekali,
    // coba generate thumbnail dari video URL (akan di-handle frontend)
    if (!result.cover && result.video) {
      console.log("[Thumbnail] No cover found, frontend will try canvas capture");
    }
  }

  // ─── VALIDATE & RETURN ─────────────────────────────────
  if (result && result.status && (result.video || result.images.length > 0)) {
    console.log("[Download] Success — cover:", result.cover ? "YES" : "NO");
    return result;
  }

  console.error("[Download] All sources failed");
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
