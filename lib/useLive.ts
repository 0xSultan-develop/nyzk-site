"use client";

/**
 * Client-side live data from the Cloudflare Worker proxy (see /worker).
 *
 * GitHub Pages can't fetch Kick/BotRix at build (datacenters are blocked, no
 * CORS), so those numbers are baked empty. This hook pulls them live in the
 * visitor's browser from the Worker, which adds CORS. One shared fetch is
 * cached module-side so Stats/LiveStream/Clips don't each hit the network.
 */
import { useEffect, useState } from "react";
import { KICK_SLUG } from "@/lib/site";
import type { Leader } from "@/lib/stats";
import type { KickChannel, KickClip } from "@/lib/kick";

export type LiveData = {
  followers?: { kick: number | null; tiktok?: number | null; x?: number | null; discord?: number | null };
  channel?: KickChannel | null;
  clips?: KickClip[];
  topGifters?: { week: Leader[]; month: Leader[]; all: Leader[] };
  streamRegulars?: Leader[];
};

const BASE = process.env.NEXT_PUBLIC_DATA_URL;

let cache: { at: number; data: LiveData } | null = null;
let inflight: Promise<LiveData | null> | null = null;

async function load(): Promise<LiveData | null> {
  if (!BASE) return null;
  if (cache && Date.now() - cache.at < 55_000) return cache.data;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${BASE}/stats?slug=${encodeURIComponent(KICK_SLUG)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as LiveData;
      cache = { at: Date.now(), data };
      return data;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Live data, refreshed every 60s. `null` until the first successful fetch. */
export function useLive(): LiveData | null {
  const [data, setData] = useState<LiveData | null>(cache?.data ?? null);
  useEffect(() => {
    let alive = true;
    const tick = () => load().then((d) => alive && d && setData(d));
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return data;
}
