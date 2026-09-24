"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { characters, type Character } from "@/lib/site";
import { asset } from "@/lib/asset";
import { SectionTitle } from "./Reveal";

const EASE = [0.22, 1, 0.36, 1] as const;
// Smooth spring for the card ⇄ detail morph and the section height change.
const SPRING = { type: "spring", stiffness: 190, damping: 30, mass: 0.9 } as const;

// Fine fractal-noise texture for a subtle sandy/light speckle at the edges.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Smooth oval fade so the image dissolves like light — never a hard rectangle.
// Generous solid center so the full character stays visible; edges still melt.
const FEATHER =
  "radial-gradient(135% 145% at 50% 45%, #000 74%, rgba(0,0,0,0.72) 88%, transparent 100%)";
const EDGE =
  "radial-gradient(135% 145% at 50% 45%, transparent 76%, #000 90%, transparent 99%)";

const hex = (a: string | undefined) => a ?? "#a855f7";

/** Full-bleed portrait: the image IS the card — no background, no border, feathered edges. */
function Portrait({ c, watermark, layoutId }: { c: Character; watermark?: string; layoutId?: string }) {
  const a = hex(c.accent);
  return (
    <motion.div layoutId={layoutId} transition={SPRING} className="absolute inset-0">
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        style={{ maskImage: FEATHER, WebkitMaskImage: FEATHER }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(70% 80% at 50% 38%, ${a}4d, ${a}12 48%, transparent 72%)`,
          }}
        />
        {c.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset(c.image)}
            alt={c.name}
            className="absolute inset-0 h-full w-full object-contain object-center"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{ backgroundImage: GRAIN, maskImage: EDGE, WebkitMaskImage: EDGE, opacity: 0.16 }}
      />

      {!c.image && (
        <span
          className="font-display pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 select-none text-[7rem] font-extrabold leading-none opacity-25"
          style={{ color: a }}
        >
          {watermark ?? c.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </motion.div>
  );
}

function GridInner({ c }: { c: Character }) {
  const a = hex(c.accent);
  return (
    <>
      <div
        className="pointer-events-none absolute -inset-4 rounded-[3rem] opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
        style={{ background: `radial-gradient(60% 60% at 50% 60%, ${a}40, transparent 70%)` }}
      />
      <Portrait c={c} layoutId={`portrait-${c.id}`} />
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-4 pb-5 pt-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="font-display block text-xl font-extrabold leading-tight">{c.name}</span>
            {c.role && <span className="text-xs text-muted">{c.role}</span>}
          </div>
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-0.5"
            style={{ background: `${a}2a`, color: a }}
          >
            →
          </span>
        </div>
      </div>
    </>
  );
}

function DetailInner({ c, onBack }: { c: Character; onBack: () => void }) {
  const a = hex(c.accent);
  return (
    <div className="relative grid min-h-[20rem] gap-0 md:grid-cols-[35%_1fr]">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[3rem] opacity-50 blur-3xl"
        style={{ background: `radial-gradient(45% 60% at 20% 55%, ${a}44, transparent 70%)` }}
      />
      <div className="relative mx-auto aspect-[454/793] w-full max-w-[15rem] self-center md:max-w-[17rem]">
        <Portrait c={c} layoutId={`portrait-${c.id}`} />
      </div>

      {/* info fades in only after the card has traveled + expanded */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.28, ease: EASE }}
        className="relative flex flex-col justify-center p-6 sm:p-9"
      >
        <div className="mb-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:border-white/20 hover:text-foreground"
          >
← رجوع
          </button>
        </div>

        {c.role && (
          <span className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: a }}>
            {c.role}
          </span>
        )}
        <h3 className="font-display mt-2 text-4xl font-extrabold leading-none md:text-6xl">{c.name}</h3>

        {c.traits && c.traits.length > 0 && (
          <div className="mt-4">
            <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              {c.traits.map((t) => (
                <div key={t.label} className="flex items-baseline gap-2 text-sm">
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-muted">
                    {t.label}
                  </dt>
                  <dd className="font-display font-semibold text-foreground">{t.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {c.quote && c.quote.length > 0 && (
          <p className="mt-4 border-l-2 pl-4 text-base italic text-foreground/90" style={{ borderColor: a }}>
            “{c.quote}”
          </p>
        )}

        {c.bio && c.bio.length > 0 ? (
          <p
            dir="rtl"
            className="font-arabic mt-5 max-w-prose text-base leading-loose text-foreground/90"
          >
            {c.bio}
          </p>
        ) : (
          <p className="mt-5 max-w-prose text-sm leading-relaxed text-muted">
            <span className="italic">السيرة قريبًا.</span>
          </p>
        )}

      </motion.div>
    </div>
  );
}

export function Characters() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIndex = characters.findIndex((c) => c.id === activeId);
  const active = activeIndex >= 0 ? characters[activeIndex] : null;

  // Center the grid when there are only a few characters so a lone card
  // doesn't sit small and lonely at the far left.
  const count = characters.length;
  const gridClass =
    count === 1
      ? "mx-auto grid max-w-[16rem] grid-cols-1 gap-7"
      : count === 2
      ? "mx-auto grid max-w-2xl grid-cols-2 gap-7"
      : count === 3
      ? "grid grid-cols-2 gap-5 sm:gap-7 md:grid-cols-3"
      : "grid grid-cols-2 gap-5 sm:gap-7 md:grid-cols-4";

  return (
    <section id="characters" className="relative mx-auto max-w-7xl px-5 py-24">
      <SectionTitle eyebrow="The Cast" title="NyZk Characters" arabic="شخصيات نيزك" />

      {/* layout wrapper animates the section height so nothing jumps/cuts.
          The clicked card (shared layoutId) morphs smoothly into the detail. */}
      <motion.div layout transition={SPRING}>
        <AnimatePresence mode="popLayout">
          {active ? (
            <motion.div
              key="detail"
              layoutId={`card-${active.id}`}
              transition={SPRING}
              className="group relative w-full"
            >
              <DetailInner c={active} onBack={() => setActiveId(null)} />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className={gridClass}
            >
              {characters.map((c, i) => (
                <motion.button
                  key={c.id}
                  layoutId={`card-${c.id}`}
                  onClick={() => setActiveId(c.id)}
                  initial={{ opacity: 0, y: 44 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  whileHover={{ y: -8 }}
                  transition={{ layout: SPRING, duration: 0.55, delay: i * 0.06, ease: EASE }}
                  className="group relative aspect-[454/793] w-full cursor-pointer text-left"
                >
                  <GridInner c={c} />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
