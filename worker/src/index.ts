/**
 * NyZk data proxy — Cloudflare Worker.
 *
 * GitHub Pages (and most datacenter hosts) are blocked by Kick/BotRix and those
 * APIs send no CORS headers, so the browser can't read them directly. This
 * Worker fetches them server-side and re-exposes the data with permissive CORS,
 * so the static site can pull LIVE data client-side.
 *
 * GET /stats?slug=<kick_slug>  → { followers, channel, clips, topGifters, streamRegulars }
 * GET /kick?slug=<kick_slug>   → { channel }   (lightweight, for live-status polling)
 */

const V2 = "https://kick.com/api/v2";
const BOTRIX = "https://botrix.live/api/public/leaderboard";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const num = (v: unknown) => (typeof v === "number" ? v : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function json(data: unknown, maxAge = 60) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${maxAge}`,
      ...CORS,
    },
  });
}

async function kickFetch(path: string) {
  const res = await fetch(`${V2}${path}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(9000),
    cf: { cacheTtl: 30, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`kick ${path} → ${res.status}`);
  return res.json();
}

async function getChannel(slug: string) {
  try {
    const d = (await kickFetch(`/channels/${encodeURIComponent(slug)}`)) as Record<string, unknown>;
    const user = (d.user ?? {}) as Record<string, unknown>;
    const ls = d.livestream as Record<string, unknown> | null;
    const cats = (ls?.categories as Record<string, unknown>[] | undefined) ?? [];
    const thumb = ls?.thumbnail as Record<string, unknown> | undefined;
    const chatroom = d.chatroom as Record<string, unknown> | undefined;
    const subBadges = (d.subscriber_badges as Record<string, unknown>[] | undefined) ?? [];
    return {
      slug: str(d.slug) ?? slug,
      chatroomId: num(chatroom?.id),
      subscriberBadges: subBadges
        .map((b) => ({ months: num(b.months), src: str((b.badge_image as Record<string, unknown> | undefined)?.src) }))
        .filter((b) => b.months != null && b.src != null),
      userId: num(d.user_id),
      username: str(user.username),
      description: str(user.bio),
      banner: str((d.banner_image as Record<string, unknown> | undefined)?.url),
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

async function getClips(slug: string) {
  try {
    const j = (await kickFetch(
      `/channels/${encodeURIComponent(slug)}/clips?sort=view&time=all`,
    )) as { clips?: Record<string, unknown>[] };
    const list = Array.isArray(j.clips) ? j.clips : [];
    return list.slice(0, 12).map((clip) => {
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

function toGifters(rows: unknown, _slug: string) {
  if (!Array.isArray(rows)) return [];
  return (rows as { username?: unknown; quantity?: unknown }[])
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

async function getGifts(slug: string) {
  const empty = { week: [], month: [], all: [] };
  try {
    const d = (await kickFetch(`/channels/${encodeURIComponent(slug)}/leaderboards`)) as Record<
      string,
      unknown
    >;
    return {
      week: toGifters(d.gifts_week, slug),
      month: toGifters(d.gifts_month, slug),
      all: toGifters(d.gifts, slug),
    };
  } catch {
    return empty;
  }
}

function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = min / 60;
  return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
}

async function getRegulars(slug: string) {
  try {
    const res = await fetch(`${BOTRIX}?platform=kick&user=${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(9000),
      cf: { cacheTtl: 30, cacheEverything: true },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { name?: unknown; watchtime?: unknown }[];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => ({ name: str(r.name), minutes: num(r.watchtime) }))
      .filter((r): r is { name: string; minutes: number } => r.name != null && r.minutes != null && r.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10)
      .map((r, i) => ({
        rank: i + 1,
        name: r.name,
        value: fmtMinutes(r.minutes),
        href: `https://kick.com/${encodeURIComponent(r.name)}`,
      }));
  } catch {
    return [];
  }
}

type Env = {
  FOLLOWERS_TIKTOK?: string;
  FOLLOWERS_X?: string;
  FOLLOWERS_KICK_FALLBACK?: string;
  DISCORD_GUILD_ID?: string;
};

const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Live Discord member count via the server widget (null if widget disabled). */
async function getDiscordMembers(guildId?: string): Promise<number | null> {
  if (!guildId) return null;
  try {
    const res = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { presence_count?: number };
    return typeof j.presence_count === "number" ? j.presence_count : null;
  } catch {
    return null;
  }
}

/**
 * All follower counts. Kick is live (Kick strips followers_count from datacenter
 * IPs, so fall back to a configured number). TikTok/X are manual config numbers.
 * Discord is live via the widget when enabled.
 */
async function getFollowers(env: Env, kickLive: number | null) {
  return {
    kick: kickLive ?? toNum(env.FOLLOWERS_KICK_FALLBACK),
    tiktok: toNum(env.FOLLOWERS_TIKTOK),
    x: toNum(env.FOLLOWERS_X),
    discord: await getDiscordMembers(env.DISCORD_GUILD_ID),
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") || "nyzzk").trim();

    if (url.pathname === "/kick") {
      return json({ channel: await getChannel(slug) }, 30);
    }

    if (url.pathname === "/stats") {
      const [channel, clips, gifts, regulars] = await Promise.all([
        getChannel(slug),
        getClips(slug),
        getGifts(slug),
        getRegulars(slug),
      ]);
      return json({
        followers: await getFollowers(env, channel?.followers ?? null),
        channel,
        clips,
        topGifters: gifts,
        streamRegulars: regulars,
        updatedAt: new Date().toISOString(),
      });
    }

    return json({ ok: true, endpoints: ["/stats?slug=", "/kick?slug="] });
  },
};
