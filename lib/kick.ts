/**
 * Kick API client — SERVER ONLY. Never import this in a client component.
 *
 * Two sources, both used defensively (any failure → null / [] so the UI
 * degrades to "Soon"/offline instead of crashing):
 *   1. Internal v2 endpoints (kick.com/api/v2) — richest: followers, avatar,
 *      live status, clips. No auth needed.
 *   2. Official OAuth public/v1 — fallback for live status, uses the app
 *      client credentials in .env.local.
 */

const TOKEN_URL = "https://id.kick.com/oauth/token";
const API_BASE = "https://api.kick.com/public/v1";
const V2_BASE = "https://kick.com/api/v2";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string | null> {
  const id = process.env.KICK_CLIENT_ID;
  const secret = process.env.KICK_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: id,
        client_secret: secret,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    cachedToken = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return cachedToken.value;
  } catch {
    return null;
  }
}

export type KickChannel = {
  slug: string;
  userId: number | null;
  username: string | null;
  description: string | null;
  banner: string | null;
  avatar: string | null;
  followers: number | null;
  verified: boolean;
  live: boolean;
  viewers: number | null;
  title: string | null;
  category: string | null;
  thumbnail: string | null;
  startedAt: string | null;
};

const num = (v: unknown) => (typeof v === "number" ? v : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Primary source: internal v2 channel — followers, avatar, live status. */
async function fromInternal(slug: string): Promise<KickChannel | null> {
  try {
    const res = await fetch(`${V2_BASE}/channels/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as Record<string, unknown>;
    const user = (d.user ?? {}) as Record<string, unknown>;
    const ls = d.livestream as Record<string, unknown> | null;
    const banner = d.banner_image as Record<string, unknown> | undefined;
    const cats = (ls?.categories as Record<string, unknown>[] | undefined) ?? [];
    const thumb = ls?.thumbnail as Record<string, unknown> | undefined;

    return {
      slug: str(d.slug) ?? slug,
      userId: num(d.user_id),
      username: str(user.username),
      description: str(user.bio),
      banner: str(banner?.url),
      avatar: str(user.profile_pic),
      followers: num(d.followers_count),
      verified: Boolean(d.verified),
      live: ls ? Boolean(ls.is_live ?? true) : false,
      viewers: num(ls?.viewer_count),
      title: str(ls?.session_title),
      category: str(cats[0]?.name),
      thumbnail: str(thumb?.url) ?? str(thumb?.src),
      startedAt: str(ls?.created_at),
    };
  } catch {
    return null;
  }
}

/** Fallback source: official OAuth public/v1 channels (live status only, no followers). */
async function fromOfficial(slug: string): Promise<KickChannel | null> {
  const token = await getAppToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/channels?slug=${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Record<string, unknown>[] };
    const raw = json.data?.[0];
    if (!raw) return null;
    const stream = (raw.stream ?? {}) as Record<string, unknown>;
    return {
      slug: str(raw.slug) ?? slug,
      userId: num(raw.broadcaster_user_id),
      username: null,
      description: str(raw.channel_description),
      banner: str(raw.banner_picture),
      avatar: null,
      followers: null,
      verified: false,
      live: Boolean(stream.is_live),
      viewers: num(stream.viewer_count),
      title: str(raw.stream_title),
      category: str((raw.category as Record<string, unknown>)?.name),
      thumbnail: str(stream.thumbnail),
      startedAt: str(stream.start_time),
    };
  } catch {
    return null;
  }
}

export async function getKickChannel(slug: string): Promise<KickChannel | null> {
  return (await fromInternal(slug)) ?? (await fromOfficial(slug));
}

export type KickGifter = { rank: number; name: string; value: string; href: string };
export type KickGiftBoards = { week: KickGifter[]; month: KickGifter[]; all: KickGifter[] };

type GiftRow = { username?: unknown; quantity?: unknown };

function toGifters(rows: unknown, slug: string): KickGifter[] {
  if (!Array.isArray(rows)) return [];
  return (rows as GiftRow[])
    .map((r) => ({ name: str(r.username), qty: num(r.quantity) }))
    .filter((r): r is { name: string; qty: number } => r.name != null && r.qty != null && r.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)
    .map((r, i) => ({
      rank: i + 1,
      name: r.name,
      value: r.qty.toLocaleString(),
      href: `https://kick.com/${encodeURIComponent(r.name)}`,
    }));
}

/**
 * Gifted-subs leaderboards from Kick's internal v2 endpoint — week / month /
 * all-time. Empty (→ "Soon") on any failure or when the channel has no gifts.
 */
export async function getKickGiftLeaderboards(slug: string): Promise<KickGiftBoards> {
  const empty: KickGiftBoards = { week: [], month: [], all: [] };
  try {
    const res = await fetch(`${V2_BASE}/channels/${encodeURIComponent(slug)}/leaderboards`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return empty;
    const d = (await res.json()) as Record<string, unknown>;
    return {
      week: toGifters(d.gifts_week, slug),
      month: toGifters(d.gifts_month, slug),
      all: toGifters(d.gifts, slug),
    };
  } catch {
    return empty;
  }
}

export type KickClip = {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  views: number | null;
  url: string;
  /** direct HLS (.m3u8) stream for on-site playback */
  videoUrl: string | null;
  createdAt: string | null;
};

/** Saved clips, most-viewed first. Returns [] on any failure → UI shows "Soon". */
export async function getKickClips(slug: string): Promise<KickClip[]> {
  try {
    const res = await fetch(
      `${V2_BASE}/channels/${encodeURIComponent(slug)}/clips?sort=date&time=all`,
      { headers: { Accept: "application/json", "User-Agent": UA }, next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { clips?: Record<string, unknown>[] };
    const list = Array.isArray(json.clips) ? json.clips : [];
    return list
      .slice()
      // Newest clip first.
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .slice(0, 12)
      .map((clip) => {
      const id = String(clip.id ?? "");
      return {
        id,
        title: str(clip.title) || "Clip",
        thumbnail: str(clip.thumbnail_url),
        duration: num(clip.duration),
        views: num(clip.view_count) ?? num(clip.views),
        url: `https://kick.com/${slug}/clips/${id}`,
        videoUrl: str(clip.video_url) ?? str(clip.clip_url),
        createdAt: str(clip.created_at),
      };
    });
  } catch {
    return [];
  }
}
