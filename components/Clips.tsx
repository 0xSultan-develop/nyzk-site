"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Hls from "hls.js";
import type { KickClip } from "@/lib/kick";
import { site } from "@/lib/site";
import { useLive } from "@/lib/useLive";
import { SectionTitle } from "./Reveal";

function fmtDuration(s: number | null) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Plays a Kick clip's HLS (.m3u8) stream directly — no iframe. */
function HlsPlayer({ src, poster }: { src: string; poster?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    let mediaRecoveries = 0;

    // Try with sound (the click that opened the modal is a user gesture);
    // if the browser still blocks it, mute and play so it never stalls.
    const tryPlay = () => {
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    // Prefer hls.js (MSE); Chrome reports canPlayType "maybe" for m3u8 but
    // can't actually decode it, so native HLS (Safari/iOS) must come last.
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal || !hls) return; // non-fatal (e.g. bufferSeekOverHole) self-heals
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (mediaRecoveries++ < 2) hls.recoverMediaError();
          else hls.destroy();
        } else hls.destroy();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", tryPlay, { once: true });
    } else {
      video.src = src;
    }

    return () => {
      hls?.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      poster={poster ?? undefined}
      controls
      autoPlay
      playsInline
      className="h-full w-full bg-black"
    />
  );
}

export function Clips({ clips }: { clips: KickClip[] }) {
  const [playing, setPlaying] = useState<KickClip | null>(null);
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Live clips (via the Worker) override the build-time snapshot.
  const live = useLive();
  const data = live?.clips?.length ? live.clips : clips;

  // Only collapse when there's more than two full rows (a peeking 3rd row).
  const expandable = data.length > 6;
  const collapsed = expandable && !expanded;

  // Measure the real grid height so the expand animates to the exact size
  // (no overshoot into empty space → perfectly smooth).
  const gridRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(0);
  const [peekH, setPeekH] = useState(560);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => {
      setContentH(el.scrollHeight);
      // peek = ~2.5 rows so the third row is half-visible
      const first = el.firstElementChild as HTMLElement | null;
      if (first) {
        const gap = parseFloat(getComputedStyle(el).rowGap || "20") || 20;
        setPeekH(Math.round(first.offsetHeight * 2.5 + gap * 2));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data.length]);

  return (
    <section ref={sectionRef} id="clips" className="relative mx-auto max-w-7xl px-5 py-24">
      <SectionTitle eyebrow="Highlights" title="Saved Clips" arabic="الكليبات المحفوظة" />

      {data.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <span className="rounded-full border border-purple/30 px-4 py-1 text-xs font-bold uppercase tracking-widest text-purple-bright">
            قريبًا
          </span>
          <p className="text-sm text-muted" dir="rtl">
            الكليبات بتظهر هنا تلقائيًا أول ما تكون موجودة في القناة.
          </p>
          <a
            href={site.kickUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-kick hover:underline"
          >
            تصفّح على كيك ←
          </a>
        </div>
      ) : (
        <>
        <div className="relative">
        <motion.div
          initial={false}
          animate={{ height: expandable ? (collapsed ? peekH : contentH) : contentH || "auto" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
        <div ref={gridRef} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((clip, i) => (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <button
                onClick={() => setPlaying(clip)}
                className="relative block aspect-video w-full overflow-hidden"
              >
                {clip.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={clip.thumbnail}
                    alt={clip.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(60%_60%_at_50%_50%,rgba(124,58,237,0.25),transparent)]" />
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-purple/90 text-white shadow-lg">
                    ▶
                  </span>
                </span>
                {fmtDate(clip.createdAt) && (
                  <span className="absolute bottom-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium">
                    {fmtDate(clip.createdAt)}
                  </span>
                )}
                {fmtDuration(clip.duration) && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium">
                    {fmtDuration(clip.duration)}
                  </span>
                )}
              </button>
              <div className="p-4">
                <a
                  href={clip.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium leading-snug transition-colors hover:text-purple-bright"
                  title="افتح الكليب على كيك"
                >
                  {clip.title}
                </a>
                {clip.views != null && (
                  <p className="mt-1 text-xs text-muted">
                    {clip.views.toLocaleString()} مشاهدة
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        </motion.div>

          {/* Peek fade + "Show more" button — OUTSIDE the clipped box so the
              button's glow/beam isn't cut. Fades in/out with the collapse. */}
          <AnimatePresence>
            {collapsed && (
              <motion.div
                key="peek"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute inset-x-0 bottom-0 flex h-72 items-end justify-center bg-gradient-to-t from-background via-background/90 to-transparent pb-3"
              >
                <button
                  onClick={() => setExpanded(true)}
                  className="font-arabic pointer-events-auto group/btn relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-purple-deep via-purple to-purple-bright px-7 py-3 text-base font-bold text-white shadow-[0_12px_34px_-8px_rgba(168,85,247,0.75)] ring-1 ring-white/15 transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_16px_44px_-6px_rgba(168,85,247,0.95)]"
                >
                  {/* continuous light beam that fully sweeps across */}
                  <span className="animate-sheen pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-transparent via-white/45 to-transparent blur-[2px]" />
                  <span className="relative">اضغط للمزيد</span>
                  <span className="relative grid h-6 w-6 place-items-center rounded-full bg-white/20 text-sm transition-transform duration-300 group-hover/btn:translate-y-0.5">
                    ↓
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse back to first rows */}
        <AnimatePresence>
          {expandable && expanded && (
            <motion.div
              key="less"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex justify-center"
            >
              <button
                onClick={() => {
                  setExpanded(false);
                  sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="font-arabic group/btn inline-flex items-center gap-2.5 rounded-full border border-purple/25 bg-surface/70 px-7 py-3 text-base font-bold text-muted backdrop-blur-sm transition-all duration-300 hover:border-purple/60 hover:text-foreground"
              >
                عرض أقل
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-sm transition-transform duration-300 group-hover/btn:-translate-y-0.5">
                  ↑
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        </>
      )}

      {/* On-site player */}
      <AnimatePresence>
        {playing && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPlaying(null)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="aspect-video w-full bg-black">
                {playing.videoUrl ? (
                  <HlsPlayer src={playing.videoUrl} poster={playing.thumbnail} />
                ) : (
                  <div className="grid h-full place-items-center px-6 text-center text-sm text-muted">
                    <a
                      href={playing.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-kick hover:underline"
                    >
                      This clip can only be watched on Kick →
                    </a>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 p-4">
                <p className="font-medium">{playing.title}</p>
                <a
                  href={playing.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm font-semibold text-kick hover:underline"
                >
                  Open on Kick →
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
