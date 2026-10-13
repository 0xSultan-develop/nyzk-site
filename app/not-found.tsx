"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { site } from "@/lib/site";

// Branded 404 — statically exported to /404.html for GitHub/Cloudflare Pages.
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Purple halo to match the hero vibe */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 50% at 50% 42%, rgba(124,58,237,0.18) 0%, rgba(88,28,135,0.28) 45%, rgba(7,6,11,0.95) 100%)",
        }}
      />

      <motion.h1
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="font-brand text-glow relative z-10 bg-gradient-to-b from-purple-bright to-purple-deep bg-clip-text text-[7rem] font-black leading-none text-transparent sm:text-[11rem]"
      >
        404
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        dir="rtl"
        className="font-arabic-display relative z-10 mt-2 text-2xl font-extrabold text-foreground sm:text-3xl"
      >
        الصفحة مو موجودة
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        dir="rtl"
        className="relative z-10 mt-3 max-w-md text-muted"
      >
        يمكن الرابط غلط أو انحذف. ارجع للرئيسية وتابع {site.brand}.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-9 flex flex-wrap items-center justify-center gap-3"
      >
        <Link
          href="/"
          className="rounded-full bg-purple px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-105"
        >
          الرئيسية
        </Link>
        <a
          href={site.kickUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-kick px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105"
        >
          شاهد على كيك
        </a>
      </motion.div>
    </main>
  );
}
