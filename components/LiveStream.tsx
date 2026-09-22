"use client";

import { useEffect, useState } from "react";
import type { KickChannel } from "@/lib/kick";
import { KICK_SLUG, site } from "@/lib/site";
import { SectionTitle } from "./Reveal";
import { KickChat } from "./KickChat";

export function LiveStream({ initial }: { initial: KickChannel | null }) {
  const [channel, setChannel] = useState<KickChannel | null>(initial);

  // Poll live status from the Worker proxy (GitHub Pages can't reach Kick).
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_DATA_URL;
    if (!base) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`${base}/kick?slug=${encodeURIComponent(KICK_SLUG)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as { channel: KickChannel | null };
        if (!cancelled && json.channel) setChannel(json.channel);
      } catch {
        /* keep last known state */
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const live = channel?.live ?? false;

  return (
    <section id="live" className="relative mx-auto max-w-7xl px-5 py-24">
      <SectionTitle eyebrow="Watch" title="Live Stream" arabic="البث المباشر" />

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Player */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black lg:flex-1">
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                live ? "live-dot bg-red-500" : "bg-muted"
              }`}
            />
            {live ? (
              channel?.viewers != null ? (
                // live → show the viewer count instead of the word "Live"
                <span className="flex items-center gap-1 text-xs font-bold tabular-nums tracking-wide">
                  {channel.viewers.toLocaleString()}
                  <span className="font-medium normal-case text-muted">watching</span>
                </span>
              ) : (
                <span className="text-xs font-bold uppercase tracking-wide">Live</span>
              )
            ) : (
              <span className="text-xs font-bold uppercase tracking-wide">Offline</span>
            )}
          </div>

          {live ? (
            <iframe
              src={`https://player.kick.com/${KICK_SLUG}`}
              title="NyZk live"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(124,58,237,0.18),transparent)] text-center">
              <p className="font-display text-2xl font-bold">Currently offline</p>
              <p className="max-w-sm text-sm text-muted">
                {channel?.title
                  ? `Last: ${channel.title}`
                  : "The stream isn't live right now — check the socials for the next one."}
              </p>
              <a
                href={site.kickUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-kick/40 px-5 py-2 text-sm font-semibold text-kick transition-colors hover:bg-kick hover:text-black"
              >
                Follow on Kick
              </a>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface lg:w-[340px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold">Live Chat</span>
            <span className="font-arabic text-xs text-muted" dir="rtl">
              الشات الحي
            </span>
          </div>
          {/* Native live chat — reads Kick's public chatroom stream directly
              in the browser (no third-party). See components/KickChat.tsx. */}
          <KickChat />
          <a
            href={site.kickUrl}
            target="_blank"
            rel="noreferrer"
            className="m-3 rounded-xl border border-border py-3 text-center text-sm font-bold transition-colors hover:bg-surface-2"
          >
            Open stream on Kick →
          </a>
        </div>
      </div>
    </section>
  );
}
