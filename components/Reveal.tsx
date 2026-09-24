"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Fade + rise on scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Small eyebrow + heading used at the top of each section. */
export function SectionTitle({
  eyebrow,
  title,
  arabic,
}: {
  eyebrow?: string;
  title: string;
  arabic?: string;
}) {
  return (
    <Reveal className="mb-10 text-center">
      <h2
        className="font-arabic-display mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl"
        dir="rtl"
      >
        {arabic || title}
      </h2>
    </Reveal>
  );
}
