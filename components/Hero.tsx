"use client";

import { motion } from "framer-motion";
import { site } from "@/lib/site";
import { asset } from "@/lib/asset";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex h-screen min-h-[640px] w-full items-center justify-end overflow-hidden"
    >
      {/* Face background — /public/hero/hero.png.
          Starts just below the nav and anchors slightly lower so the head
          clears the header and the face sits nicely in frame. */}
      <div
        className="absolute inset-x-0 bottom-0 top-20 bg-cover"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(7,6,11,0.35) 0%, rgba(7,6,11,0.15) 40%, rgba(7,6,11,0.9) 100%), url('${asset("/hero/hero.png")}')`,
          backgroundPosition: "center 12%",
          backgroundColor: "#0b0714",
        }}
      />

      {/* Purple shadow — hides most of the room, keeps focus on the face */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 42%, rgba(124,58,237,0.10) 0%, rgba(88,28,135,0.35) 45%, rgba(7,6,11,0.92) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,transparent_30%,rgba(7,6,11,0.85)_100%)]" />

      {/* Brand — right side, raised a touch above center */}
      <div className="relative z-10 -mt-16 flex flex-col items-end pr-6 text-right sm:pr-14 md:pr-24">
        <motion.h1
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-brand text-glow text-6xl font-black uppercase leading-none tracking-tight sm:text-8xl md:text-[8.5rem]"
        >
          {site.brand}
        </motion.h1>
      </div>

      {/* #1 — standalone, far left, big */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 sm:left-10 md:left-16"
      >
        <span className="font-brand text-glow block bg-gradient-to-b from-purple-bright to-purple bg-clip-text text-8xl font-black leading-none text-transparent sm:text-9xl md:text-[13rem]">
          {site.tagline}
        </span>
      </motion.div>

    </section>
  );
}
