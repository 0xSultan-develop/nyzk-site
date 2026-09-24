"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { socials, type Social } from "@/lib/site";
import { asset } from "@/lib/asset";
import { SectionTitle } from "./Reveal";

/** Minimal brand glyphs — fallback until the 3D PNGs are dropped in /public/icons3d */
function Glyph({ k, className = "h-9 w-9" }: { k: string; className?: string }) {
  const common = className;
  switch (k) {
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor">
          <path d="M18.9 2H22l-7.3 8.4L23 22h-6.8l-5-6.5L5.5 22H2.4l7.8-9L1.6 2h7l4.5 6zM17.7 20l-9.9-13H6.2l10 13z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor">
          <path d="M16 3c.3 2.2 1.6 3.9 3.8 4.1v2.7c-1.3.1-2.6-.3-3.8-1v5.6a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.9a2.8 2.8 0 1 0 2 2.6V3z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "snapchat":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor">
          <path d="M12 2c2.6 0 4.3 2 4.4 4.6.1 1 0 1.8 0 2 .3.2.8.3 1.3.1.9-.3 1.4.9.5 1.4-.6.3-1.4.4-1.6.9-.2.6.9 2.4 2.8 3.1.5.2.4.8-.1 1-.6.2-1.3.2-1.6.7-.2.4.1 1-.5 1.1-.7.1-1.5-.4-2.6 0-1 .4-1.7 1.6-3.9 1.6s-2.9-1.2-3.9-1.6c-1.1-.4-1.9.1-2.6 0-.6-.1-.3-.7-.5-1.1-.3-.5-1-.5-1.6-.7-.5-.2-.6-.8-.1-1 1.9-.7 3-2.5 2.8-3.1-.2-.5-1-.6-1.6-.9-.9-.5-.4-1.7.5-1.4.5.2 1 .1 1.3-.1 0-.2-.1-1 0-2C7.7 4 9.4 2 12 2z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor">
          <path d="M20 5.3A17 17 0 0 0 15.7 4l-.2.4a13 13 0 0 1 3.6 1.8 12 12 0 0 0-10.2 0A13 13 0 0 1 12.5 4.4L12.3 4A17 17 0 0 0 8 5.3C5.3 9.3 4.6 13.2 5 17a17 17 0 0 0 5.2 2.6l.6-1a11 11 0 0 1-1.8-.9l.4-.3a12 12 0 0 0 9.2 0l.4.3c-.6.4-1.2.7-1.8.9l.6 1A17 17 0 0 0 23 17c.4-4.4-.6-8.2-3-11.7zM9.7 14.7c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7zm4.6 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.6 1.7-1.5 1.7z" />
        </svg>
      );
    default:
      return null;
  }
}

function Card({ s, i, wide }: { s: Social; i: number; wide?: boolean }) {
  const soon = s.handle === "soon";
  const Wrapper = soon ? "div" : "a";
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(s.icon3d) && !broken;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <Wrapper
        {...(!soon ? { href: s.url, target: "_blank", rel: "noreferrer" } : {})}
        className={`group relative flex h-36 items-center justify-center overflow-hidden rounded-[1.75rem] border border-border bg-surface transition-transform duration-300 ease-out sm:h-40 ${
          wide ? "flex-row gap-5" : "flex-col gap-2.5"
        } ${soon ? "cursor-default opacity-70" : "hover:-translate-y-2"}`}
      >
        <span
          className="absolute -bottom-8 h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-80"
          style={{ background: s.color, opacity: 0.28 }}
        />
        {/* 3D icon slot — the PNG shows once added; glyph is the fallback */}
        <span
          className={`relative z-10 flex items-center justify-center rounded-3xl ${
            wide ? "h-24 w-24" : "h-16 w-16"
          }`}
          style={{ color: s.color }}
        >
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset(s.icon3d)}
              alt={s.label}
              className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:rotate-3"
              onError={() => setBroken(true)}
            />
          ) : (
            <Glyph k={s.key} className={wide ? "h-14 w-14" : "h-9 w-9"} />
          )}
        </span>
        <div className={`relative z-10 ${wide ? "text-left" : "text-center"}`}>
          <p className={`font-display font-bold ${wide ? "text-3xl" : "text-base"}`}>{s.label}</p>
          <p className={`text-muted ${wide ? "text-base" : "text-sm"}`}>
            {soon ? "قريبًا" : s.key === "discord" ? s.handle : `@${s.handle}`}
          </p>
        </div>
      </Wrapper>
    </motion.div>
  );
}

// Fixed order requested: Instagram, Snapchat / TikTok, X / Discord (centered).
const ORDER = ["instagram", "snapchat", "tiktok", "x", "discord"];

export function Socials() {
  const ordered = ORDER.map((k) => socials.find((s) => s.key === k)).filter(
    (s): s is Social => Boolean(s),
  );
  const main = ordered.slice(0, 4);
  const last = ordered[4];

  return (
    <section id="socials" className="relative mx-auto max-w-7xl px-5 py-24">
      <SectionTitle eyebrow="Follow" title="Social Media" arabic="حسابات السوشل ميديا" />

      <div className="mx-auto grid max-w-2xl grid-cols-2 gap-4 sm:gap-5">
        {main.map((s, i) => (
          <Card key={s.key} s={s} i={i} />
        ))}
        {last && (
          <div className="col-span-2">
            <Card s={last} i={4} wide />
          </div>
        )}
      </div>
    </section>
  );
}
