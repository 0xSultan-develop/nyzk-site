"use client";

/**
 * Live chat — polls Kick's recent chat messages through our Cloudflare Worker
 * (Kick moved its realtime stream to a private WebSocket, so the old public
 * Pusher channel no longer works; the REST history endpoint is stable). The
 * Worker fetches server-side, so there's no browser CORS/geoblock. Renders Kick
 * badges, emotes and colored names, and persists recent messages so the chat
 * isn't blank on reload — just like Kick.
 */
import { memo, useEffect, useRef, useState } from "react";
import { KICK_SLUG } from "@/lib/site";
import { asset } from "@/lib/asset";

const STORE_KEY = `nyzk-chat:${KICK_SLUG}`;
const MAX = 100;
// Drop restored history older than this so stale chat doesn't linger on reload.
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const POLL_MS = 4000;

// Kick badge type → local SVG (downloaded from Kick's set, served by us).
const BADGE_SRC: Record<string, string> = {
  broadcaster: "/badges/broadcaster.svg",
  moderator: "/badges/mod.svg",
  og: "/badges/og.svg",
  vip: "/badges/vip.svg",
  verified: "/badges/verified.svg",
  founder: "/badges/founder.svg",
  staff: "/badges/admin.svg",
  bot: "/badges/bot.svg",
  subscriber: "/badges/subscriber.svg",
};

type Badge = { type: string; text: string; count?: number };
type Part = { t: "text"; v: string } | { t: "emote"; id: string; name: string };
type ChatMsg = { id: string; name: string; color: string; badges: Badge[]; parts: Part[]; ts: number };
type SubBadge = { months: number; src: string };

// Shape returned by the Worker's /messages endpoint.
type ApiMsg = {
  id: string;
  content: string;
  createdAt: string;
  sender?: { username?: string; identity?: { color?: string; badges?: Badge[] } };
};

function parseContent(content: string): Part[] {
  const parts: Part[] = [];
  const re = /\[emote:(\d+):([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m.index > last) parts.push({ t: "text", v: content.slice(last, m.index) });
    parts.push({ t: "emote", id: m[1], name: m[2] });
    last = re.lastIndex;
  }
  if (last < content.length) parts.push({ t: "text", v: content.slice(last) });
  return parts;
}

function toChatMsg(a: ApiMsg): ChatMsg {
  const rawColor = a.sender?.identity?.color || "";
  const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : "#a78bfa";
  return {
    id: a.id || Math.random().toString(36),
    name: a.sender?.username || "user",
    color,
    badges: Array.isArray(a.sender?.identity?.badges) ? a.sender!.identity!.badges! : [],
    parts: parseContent(a.content || ""),
    ts: Date.parse(a.createdAt) || Date.now(),
  };
}

function BadgeIcon({ b, subBadges }: { b: Badge; subBadges: SubBadge[] }) {
  let src: string | undefined;
  if (b.type === "subscriber") {
    // Channel's custom badge for the highest tier the months reach, else default.
    const tier = [...subBadges]
      .sort((a, z) => z.months - a.months)
      .find((t) => (b.count ?? 0) >= t.months);
    // tier.src is a full Kick CDN URL; the default badge is a local asset.
    src = tier?.src ?? asset(BADGE_SRC.subscriber);
  } else {
    src = BADGE_SRC[b.type];
    if (src) src = asset(src);
  }
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={b.text || b.type}
      title={b.text || b.type}
      className="mr-1 inline-block h-4 w-4 shrink-0 align-middle"
    />
  );
}

// One chat line. Memoized so a new message doesn't re-render the whole list.
const ChatRow = memo(function ChatRow({ m, subBadges }: { m: ChatMsg; subBadges: SubBadge[] }) {
  return (
    <p className="text-sm leading-snug">
      {m.badges.map((b, i) => (
        <BadgeIcon key={i} b={b} subBadges={subBadges} />
      ))}
      <span className="font-semibold" style={{ color: m.color }}>
        {m.name}
      </span>
      <span className="text-muted">: </span>
      {m.parts.map((p, i) =>
        p.t === "text" ? (
          <span key={i} className="text-foreground/90">
            {p.v}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={`https://files.kick.com/emotes/${p.id}/fullsize`}
            alt={p.name}
            loading="lazy"
            className="mx-0.5 inline-block h-6 w-6 align-middle"
          />
        ),
      )}
    </p>
  );
});

export function KickChat() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<"connecting" | "idle" | "live">("connecting");
  // null = unknown yet, true/false = channel live state (chat only flows live).
  const [live, setLive] = useState<boolean | null>(null);
  const subBadges = useRef<SubBadge[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  // Restore persisted history immediately (so it's never blank on reload).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        const cutoff = Date.now() - MAX_AGE_MS;
        const list = (JSON.parse(saved) as ChatMsg[]).filter((m) => (m.ts ?? 0) > cutoff);
        list.forEach((m) => seen.current.add(m.id));
        setMsgs(list);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Poll Kick's recent messages through the Worker and append new ones.
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_DATA_URL;
    if (!base) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    let chatroomId: number | null = null;

    async function tick() {
      try {
        // Refresh channel info every tick so live-status (and thus the empty
        // state) stays current; chatroomId/subBadges only need reading once.
        const r = await fetch(`${base}/kick?slug=${encodeURIComponent(KICK_SLUG)}`, { cache: "no-store" });
        const ch = ((await r.json()) as {
          channel?: { chatroomId?: number; subscriberBadges?: SubBadge[]; live?: boolean };
        }).channel;
        if (!stop) setLive(Boolean(ch?.live));
        if (chatroomId == null) {
          chatroomId = ch?.chatroomId ?? null;
          if (Array.isArray(ch?.subscriberBadges)) subBadges.current = ch!.subscriberBadges!;
        }
        const q = chatroomId
          ? `chatroomId=${chatroomId}`
          : `slug=${encodeURIComponent(KICK_SLUG)}`;
        const res = await fetch(`${base}/messages?${q}`, { cache: "no-store" });
        const list = ((await res.json()) as { messages?: ApiMsg[] }).messages ?? [];
        if (!stop) {
          const fresh = list.filter((a) => a.id && !seen.current.has(a.id));
          if (fresh.length) {
            fresh.forEach((a) => seen.current.add(a.id));
            setMsgs((prev) => [...prev, ...fresh.map(toChatMsg)].slice(-MAX));
            setStatus("live");
          } else {
            setStatus((s) => (s === "live" ? "live" : "idle"));
          }
        }
      } catch {
        /* keep previous messages; try again next tick */
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    }

    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, []);

  // Keep history (debounced) so the chat isn't blank on the next reload.
  useEffect(() => {
    if (msgs.length === 0) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(msgs));
      } catch {
        /* quota / private mode */
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [msgs]);

  // Auto-scroll to newest unless the viewer has scrolled up to read history.
  useEffect(() => {
    const el = listRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  return (
    <div
      ref={listRef}
      onScroll={() => {
        const el = listRef.current;
        if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }}
      className="scroll-thin flex min-h-[480px] flex-1 flex-col gap-1.5 overflow-y-auto bg-black/40 px-3 py-3 lg:min-h-0"
    >
      {msgs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center">
          <p className="text-xs text-muted">
            {live === false
              ? "البث مو شغّال حالياً 🔴 — الشات يفتح أول ما يبدأ البث"
              : status === "connecting"
              ? "جارٍ الاتصال بالشات…"
              : "الشات متصل — الشات يشتغل مع البث"}
          </p>
        </div>
      ) : (
        msgs.map((m) => <ChatRow key={m.id} m={m} subBadges={subBadges.current} />)
      )}
    </div>
  );
}
