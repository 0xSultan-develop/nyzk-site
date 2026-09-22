"use client";

/**
 * Native live chat — reads Kick's PUBLIC chatroom stream directly in the
 * viewer's browser (the same public Pusher channel Kick's own site uses). No
 * third-party service. Renders Kick badges (broadcaster/mod/sub/OG/VIP/…),
 * emotes, colored names, and persists recent messages to localStorage so the
 * chat isn't empty on reload — just like Kick.
 */
import { useEffect, useRef, useState } from "react";
import { KICK_SLUG } from "@/lib/site";
import { asset } from "@/lib/asset";

const PUSHER_KEY = "32cbd69e4b950bf97679";
const PUSHER_URL = `wss://ws-us2.pusher.com/app/${PUSHER_KEY}?protocol=7&client=js&version=8.4.0&flash=false`;
const STORE_KEY = `nyzk-chat:${KICK_SLUG}`;
const MAX = 100;

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
type ChatMsg = { id: string; name: string; color: string; badges: Badge[]; parts: Part[] };
type SubBadge = { months: number; src: string };

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

export function KickChat() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<"connecting" | "idle" | "live">("connecting");
  const subBadges = useRef<SubBadge[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  // Restore persisted history immediately (so it's never blank on reload).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) setMsgs(JSON.parse(saved) as ChatMsg[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_DATA_URL;
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;

    async function connect() {
      let chatroomId: number | null = null;
      try {
        if (base) {
          const r = await fetch(`${base}/kick?slug=${encodeURIComponent(KICK_SLUG)}`, { cache: "no-store" });
          const ch = ((await r.json()) as { channel?: { chatroomId?: number; subscriberBadges?: SubBadge[] } }).channel;
          chatroomId = ch?.chatroomId ?? null;
          if (Array.isArray(ch?.subscriberBadges)) subBadges.current = ch!.subscriberBadges!;
        }
      } catch {
        /* ignore */
      }
      if (closed || !chatroomId) {
        if (!closed) retry = setTimeout(connect, 5000);
        return;
      }

      ws = new WebSocket(PUSHER_URL);
      ws.onmessage = (e) => {
        let m: { event?: string; data?: unknown };
        try {
          m = JSON.parse(e.data as string);
        } catch {
          return;
        }
        if (m.event === "pusher:connection_established") {
          setStatus("idle");
          ws?.send(JSON.stringify({ event: "pusher:subscribe", data: { auth: "", channel: `chatrooms.${chatroomId}.v2` } }));
        } else if (m.event === "pusher:ping") {
          ws?.send(JSON.stringify({ event: "pusher:pong", data: {} }));
        } else if (m.event === "App\\Events\\ChatMessageEvent") {
          try {
            const d = JSON.parse(m.data as string) as {
              id: string;
              content: string;
              sender?: { username?: string; identity?: { color?: string; badges?: Badge[] } };
            };
            const msg: ChatMsg = {
              id: d.id || Math.random().toString(36),
              name: d.sender?.username || "user",
              color: d.sender?.identity?.color || "#a78bfa",
              badges: Array.isArray(d.sender?.identity?.badges) ? d.sender!.identity!.badges! : [],
              parts: parseContent(d.content || ""),
            };
            setStatus("live");
            setMsgs((prev) => {
              const next = [...prev.slice(-(MAX - 1)), msg];
              try {
                localStorage.setItem(STORE_KEY, JSON.stringify(next));
              } catch {
                /* quota / private mode */
              }
              return next;
            });
          } catch {
            /* ignore */
          }
        }
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 4000);
      };
      ws.onerror = () => ws?.close();
    }

    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, []);

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
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted">
            {status === "live" ? "…" : "بانتظار رسائل الشات المباشر…"}
          </p>
        </div>
      ) : (
        msgs.map((m) => (
          <p key={m.id} className="text-sm leading-snug">
            {m.badges.map((b, i) => (
              <BadgeIcon key={i} b={b} subBadges={subBadges.current} />
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
                  className="mx-0.5 inline-block h-6 w-6 align-middle"
                />
              ),
            )}
          </p>
        ))
      )}
    </div>
  );
}
