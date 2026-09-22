"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Leader, SiteStats } from "@/lib/stats";
import { useLive } from "@/lib/useLive";
import { asset } from "@/lib/asset";

const EASE = [0.22, 1, 0.36, 1] as const;
import { compact } from "@/lib/format";
import { socials } from "@/lib/site";
import { SectionTitle } from "./Reveal";

const urlFor = (key: string) => socials.find((s) => s.key === key)?.url;

// Order matters: 2 per row → row 1: Kick + TikTok, row 2: X + Discord.
// icon = ready-made 3D PNG under /public/icons3d (drop kick.png to complete the set).
const followerMeta = [
  { key: "kick", label: "Kick Followers", color: "#53fc18", arabic: "متابعين كيك", icon: "/icons3d/kick.svg", iconClass: "scale-90" },
  { key: "tiktok", label: "TikTok Followers", color: "#25f4ee", arabic: "متابعين تيك توك", icon: "/icons3d/tiktok.png", iconClass: "" },
  { key: "x", label: "X Followers", color: "#e7e7e7", arabic: "متابعين X", icon: "/icons3d/x.png", iconClass: "" },
  { key: "discord", label: "Discord Members", color: "#5865f2", arabic: "أعضاء ديسكورد", icon: "/icons3d/discord.png", iconClass: "" },
] as const;

function SoonPill() {
  return (
    <span className="rounded-full border border-purple/30 px-3 py-0.5 text-xs font-bold uppercase tracking-widest text-purple-bright">
      Soon
    </span>
  );
}

function FollowerTile({
  label,
  arabic,
  color,
  value,
  icon,
  iconClass,
  i,
}: {
  label: string;
  arabic: string;
  color: string;
  value: number | null;
  icon?: string;
  iconClass?: string;
  i: number;
}) {
  const [broken, setBroken] = useState(false);
  const showIcon = Boolean(icon) && !broken;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
      className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-3xl border border-border bg-surface p-6"
    >
      <span
        className="absolute -right-6 -top-6 h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-90"
        style={{ background: color, opacity: 0.22 }}
      />

      {/* Ready-made 3D logo in the corner (falls back to a color dot) */}
      <div className="absolute right-4 top-4 h-14 w-14 sm:h-20 sm:w-20">
        {showIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset(icon)}
            alt={label}
            className={`h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3 ${iconClass ?? ""}`}
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="mt-1 block h-3 w-3 rounded-full" style={{ background: color }} />
        )}
      </div>

      {/* Number in ink, not the brand color (accessibility) */}
      <p className="font-display relative text-4xl font-extrabold tabular-nums sm:text-5xl">
        {value == null ? <SoonPill /> : compact(value)}
      </p>
      <p className="relative mt-2 text-sm text-muted">{label}</p>
      <p className="font-arabic relative text-xs text-muted/70" dir="rtl">
        {arabic}
      </p>
    </motion.div>
  );
}

function Board({
  title,
  arabic,
  hint,
  rows,
  delay = 0,
}: {
  title: string;
  arabic: string;
  hint?: string;
  rows: Leader[];
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className="flex flex-col rounded-2xl border border-border bg-surface p-6"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">{title}</h3>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        <span className="font-arabic text-sm text-muted" dir="rtl">
          {arabic}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10">
          <SoonPill />
          <p className="text-xs text-muted">Data connects here soon.</p>
        </div>
      ) : (
        <ol className="scroll-thin flex flex-col gap-1">
          {rows.map((r) => (
            <li
              key={r.rank}
              className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2"
            >
              <span
                className={`font-display w-6 text-center text-sm font-extrabold ${
                  r.rank === 1
                    ? "text-yellow-400"
                    : r.rank === 2
                      ? "text-slate-300"
                      : r.rank === 3
                        ? "text-amber-600"
                        : "text-muted"
                }`}
              >
                {r.rank}
              </span>
              {r.href ? (
                <a
                  href={r.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate text-sm font-medium transition-colors hover:text-purple-bright"
                >
                  {r.name}
                </a>
              ) : (
                <span className="flex-1 truncate text-sm font-medium">{r.name}</span>
              )}
              <span className="font-display text-sm font-bold tabular-nums text-purple-bright">
                {r.value}
              </span>
            </li>
          ))}
        </ol>
      )}
    </motion.div>
  );
}

type Period = "week" | "month" | "all";

export function Stats({ stats }: { stats: SiteStats }) {
  // Live data (client-side, via the Worker) overrides the build-time snapshot.
  const live = useLive();
  const s: SiteStats = live
    ? {
        ...stats,
        followers: { ...stats.followers, kick: live.followers?.kick ?? stats.followers.kick },
        topGifters: live.topGifters ?? stats.topGifters,
        streamRegulars: live.streamRegulars ?? stats.streamRegulars,
      }
    : stats;

  // Default to the widest period that actually has data, so a fresh gift that
  // Kick has only recorded in week/month (all-time lags) still shows on load.
  const pick = (g: SiteStats["topGifters"]): Period =>
    g.all.length ? "all" : g.month.length ? "month" : g.week.length ? "week" : "all";
  const [period, setPeriod] = useState<Period>(() => pick(s.topGifters));
  const [touched, setTouched] = useState(false);
  // When live data arrives after mount, jump to a populated tab (unless the
  // user already picked one) so the board isn't stuck on an empty period.
  useEffect(() => {
    if (!touched && !s.topGifters[period].length) setPeriod(pick(s.topGifters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);
  const periods: { key: Period; label: string; ar: string }[] = [
    { key: "week", label: "Week", ar: "الأسبوع" },
    { key: "month", label: "Month", ar: "الشهر" },
    { key: "all", label: "All", ar: "الكل" },
  ];

  return (
    <>
    {/* ── Part 1: Accounts — two squares per row (Kick+TikTok / X+Discord) ── */}
    <section id="stats" className="relative mx-auto max-w-7xl px-5 py-24">
      <SectionTitle eyebrow="The Numbers" title="Community Stats" arabic="الإحصائيات" />

      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:gap-6">
        {followerMeta.map((m, i) => {
          const url = urlFor(m.key);
          const tile = (
            <FollowerTile
              label={m.label}
              arabic={m.arabic}
              color={m.color}
              icon={m.icon}
              iconClass={m.iconClass}
              value={s.followers[m.key]}
              i={i}
            />
          );
          return url ? (
            <a
              key={m.key}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block transition-transform hover:-translate-y-1"
            >
              {tile}
            </a>
          ) : (
            <div key={m.key}>{tile}</div>
          );
        })}
      </div>
    </section>

    {/* ── Part 2: Leaderboards — their own section ── */}
    <section id="leaderboards" className="relative mx-auto max-w-7xl px-5 py-24">
      <SectionTitle eyebrow="Rankings" title="Leaderboards" arabic="المتصدّرون" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Gifters with period tabs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0, ease: EASE }}
          className="flex flex-col rounded-2xl border border-border bg-surface p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Top Gifters</h3>
            <div className="flex rounded-full border border-border p-0.5">
              {periods.map((p) => (
                <button
                  key={p.key}
                  onClick={() => { setTouched(true); setPeriod(p.key); }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    period === p.key
                      ? "bg-purple text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {s.topGifters[period].length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10">
              <SoonPill />
              <p className="text-xs text-muted">Gifting leaderboard connects soon.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.ol
                key={period}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="flex flex-col gap-1"
              >
                {s.topGifters[period].map((r) => (
                  <li
                    key={r.rank}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2"
                  >
                    <span className="font-display w-6 text-center text-sm font-extrabold text-muted">
                      {r.rank}
                    </span>
                    {r.href ? (
                      <a
                        href={r.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 truncate text-sm font-medium transition-colors hover:text-purple-bright"
                      >
                        {r.name}
                      </a>
                    ) : (
                      <span className="flex-1 truncate text-sm font-medium">{r.name}</span>
                    )}
                    <span className="font-display text-sm font-bold text-purple-bright">
                      {r.value}
                    </span>
                  </li>
                ))}
              </motion.ol>
            </AnimatePresence>
          )}
        </motion.div>

        <Board
          title="Stream Regulars"
          arabic="الأكثر حضورًا"
          hint="Ranked by watch time · signed in on Kick"
          rows={s.streamRegulars}
          delay={0.1}
        />
      </div>
    </section>
    </>
  );
}
