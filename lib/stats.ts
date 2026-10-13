/**
 * Aggregated community stats — SERVER ONLY.
 * Real where we have a source; `null` (→ "Soon" in UI) otherwise.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getKickChannel, getKickGiftLeaderboards } from "@/lib/kick";
import { KICK_SLUG } from "@/lib/site";

export type Leader = { rank: number; name: string; value: string; avatar?: string; href?: string };

export type SiteStats = {
  followers: {
    kick: number | null;
    tiktok: number | null;
    x: number | null;
    discord: number | null;
  };
  topGifters: { week: Leader[]; month: Leader[]; all: Leader[] };
  streamRegulars: Leader[];
  kickTopGifters: Leader[];
  updatedAt: string;
};

/** Parse a manual count from an env var (e.g. "12500" or "12.5k"). */
function manual(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.trim().toLowerCase().match(/^([\d.]+)\s*([km]?)$/);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1);
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function getDiscordMembers(): Promise<number | null> {
  const override = manual(process.env.DISCORD_MEMBERS);
  if (override != null) return override;
  const guild = process.env.DISCORD_GUILD_ID;
  if (!guild) return null;
  try {
    // Requires "Server Widget" enabled in Discord server settings.
    const res = await fetch(`https://discord.com/api/guilds/${guild}/widget.json`, {
      next: { revalidate: 120 }, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { presence_count?: number };
    return typeof json.presence_count === "number" ? json.presence_count : null;
  } catch {
    return null;
  }
}

async function getXFollowers(): Promise<number | null> {
  const override = manual(process.env.X_FOLLOWERS);
  if (override != null) return override;
  const token = process.env.X_BEARER_TOKEN;
  const username = process.env.NEXT_PUBLIC_X_USERNAME;
  if (!token || !username) return null;
  try {
    const res = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { public_metrics?: { followers_count?: number } };
    };
    return json.data?.public_metrics?.followers_count ?? null;
  } catch {
    return null;
  }
}

function getTiktokFollowers(): number | null {
  return manual(process.env.TIKTOK_FOLLOWERS);
}

/**
 * Watch-hours leaderboard ("Stream Regulars") — viewers ranked by time watched.
 *
 * Kick's API can't produce this; watchtime is tracked by the BotRix bot that
 * sits in the channel's chat. BotRix exposes it on a public endpoint, keyed by
 * the channel name (same as the Kick slug). `watchtime` is returned in MINUTES.
 *
 * Sources, in order (first that yields rows wins):
 *   1. BotRix public leaderboard for BOTRIX_CHANNEL (defaults to the Kick slug).
 *   2. WATCH_HOURS_URL — a custom JSON endpoint, shape: [{slug,name,hours}] or {viewers:[...]}.
 *   3. data/watch-hours.json — a local hand-curated file, same shape.
 * Any failure / empty → [] → the board shows "Soon".
 */
const BOTRIX_BASE = "https://botrix.live/api/public/leaderboard";

type BotrixRow = { name?: string; watchtime?: number };
type WatchRow = { slug?: string; name?: string; username?: string; hours?: number };

/** "930" → "15.5h", "45" → "45m", "6000" → "100h". Input is minutes. */
function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = min / 60;
  return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
}

/** BotRix rows → Leader[], ranked by watchtime (minutes) descending. */
function fromBotrix(rows: BotrixRow[]): Leader[] {
  return rows
    .map((r) => ({ name: (r.name ?? "").trim(), minutes: Number(r.watchtime) }))
    .filter((r) => r.name && Number.isFinite(r.minutes) && r.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 20)
    .map((r, i) => ({
      rank: i + 1,
      name: r.name,
      value: fmtMinutes(r.minutes),
      href: `https://kick.com/${encodeURIComponent(r.name)}`,
    }));
}

/** Custom / local rows (hours already in hours) → Leader[]. */
function fromHours(rows: WatchRow[]): Leader[] {
  return rows
    .map((r) => {
      const slug = (r.slug ?? r.username ?? r.name ?? "").trim();
      const hours = Number(r.hours);
      if (!slug || !Number.isFinite(hours) || hours <= 0) return null;
      return { slug, name: r.name?.trim() || slug, hours };
    })
    .filter((r): r is { slug: string; name: string; hours: number } => r !== null)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 20)
    .map((r, i) => ({
      rank: i + 1,
      name: r.name,
      value: fmtMinutes(r.hours * 60),
      href: `https://kick.com/${encodeURIComponent(r.slug)}`,
    }));
}

async function fromBotrixApi(): Promise<Leader[]> {
  const channel = process.env.BOTRIX_CHANNEL ?? KICK_SLUG;
  try {
    const res = await fetch(
      `${BOTRIX_BASE}?platform=kick&user=${encodeURIComponent(channel)}`,
      { next: { revalidate: 120 }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? fromBotrix(json as BotrixRow[]) : [];
  } catch {
    return [];
  }
}

async function getStreamRegulars(): Promise<Leader[]> {
  const botrix = await fromBotrixApi();
  if (botrix.length) return botrix;

  const url = process.env.WATCH_HOURS_URL;
  if (url) {
    try {
      const res = await fetch(url, { next: { revalidate: 120 }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const json = (await res.json()) as WatchRow[] | { viewers?: WatchRow[] };
        return fromHours(Array.isArray(json) ? json : json.viewers ?? []);
      }
    } catch {
      /* fall through to local file */
    }
  }
  try {
    const file = path.join(process.cwd(), "data", "watch-hours.json");
    const json = JSON.parse(await readFile(file, "utf8")) as WatchRow[] | { viewers?: WatchRow[] };
    return fromHours(Array.isArray(json) ? json : json.viewers ?? []);
  } catch {
    return [];
  }
}

export async function getSiteStats(): Promise<SiteStats> {
  const [channel, discord, x, streamRegulars, giftBoards] = await Promise.all([
    getKickChannel(KICK_SLUG),
    getDiscordMembers(),
    getXFollowers(),
    getStreamRegulars(),
    getKickGiftLeaderboards(KICK_SLUG),
  ]);

  return {
    followers: {
      kick: channel?.followers ?? null,
      tiktok: getTiktokFollowers(),
      x,
      discord,
    },
    // These come from the bot's database (gifts / watch hours).
    // Wire the bot export here later; empty arrays render as "Soon".
    topGifters: giftBoards,
    streamRegulars,
    kickTopGifters: [],
    updatedAt: new Date().toISOString(),
  };
}
