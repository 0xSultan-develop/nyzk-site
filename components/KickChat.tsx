"use client";

/**
 * Native live chat — reads Kick's PUBLIC chatroom stream directly in the
 * viewer's browser (the same public Pusher channel Kick's own site and third-
 * party viewers use). No third-party service, fully styled to the site.
 *
 * Flow: get chatroomId from the Worker → open the public Pusher socket →
 * subscribe to `chatrooms.<id>.v2` (no auth) → render ChatMessageEvent.
 */
import { useEffect, useRef, useState } from "react";
import { KICK_SLUG } from "@/lib/site";

// Kick's public Pusher app (used by kick.com itself for chat). Read-only.
const PUSHER_KEY = "32cbd69e4b950bf97679";
const PUSHER_URL = `wss://ws-us2.pusher.com/app/${PUSHER_KEY}?protocol=7&client=js&version=8.4.0&flash=false`;

type ChatMsg = {
  id: string;
  name: string;
  color: string;
  parts: ({ t: "text"; v: string } | { t: "emote"; id: string; name: string })[];
};

// Kick embeds emotes as [emote:ID:name]; split content into text + emote parts.
function parseContent(content: string): ChatMsg["parts"] {
  const parts: ChatMsg["parts"] = [];
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

export function KickChat() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "idle">("connecting");
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

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
          chatroomId = ((await r.json()) as { channel?: { chatroomId?: number } }).channel?.chatroomId ?? null;
        }
      } catch {
        /* ignore */
      }
      if (closed || !chatroomId) {
        if (!closed) retry = setTimeout(connect, 5000);
        return;
      }

      ws = new WebSocket(PUSHER_URL);
      ws.onopen = () => setStatus((s) => (s === "connecting" ? "connecting" : s));
      ws.onmessage = (e) => {
        let m: { event?: string; data?: unknown };
        try {
          m = JSON.parse(e.data as string);
        } catch {
          return;
        }
        if (m.event === "pusher:connection_established") {
          setStatus("idle");
          ws?.send(
            JSON.stringify({
              event: "pusher:subscribe",
              data: { auth: "", channel: `chatrooms.${chatroomId}.v2` },
            }),
          );
        } else if (m.event === "pusher:ping") {
          ws?.send(JSON.stringify({ event: "pusher:pong", data: {} }));
        } else if (m.event === "App\\Events\\ChatMessageEvent") {
          try {
            const d = JSON.parse(m.data as string) as {
              id: string;
              content: string;
              sender?: { username?: string; identity?: { color?: string } };
            };
            const msg: ChatMsg = {
              id: d.id || Math.random().toString(36),
              name: d.sender?.username || "user",
              color: d.sender?.identity?.color || "#a78bfa",
              parts: parseContent(d.content || ""),
            };
            setStatus("live");
            setMsgs((prev) => [...prev.slice(-120), msg]);
          } catch {
            /* ignore malformed */
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

  // Auto-scroll to newest unless the viewer scrolled up to read history.
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
