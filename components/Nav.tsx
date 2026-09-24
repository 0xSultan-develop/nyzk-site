"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

const links = [
  { href: "#characters", label: "الشخصيات" },
  { href: "#live", label: "البث" },
  { href: "#clips", label: "الكليبات" },
  { href: "#stats", label: "الإحصائيات" },
  { href: "#leaderboards", label: "المتصدّرون" },
  { href: "#socials", label: "السوشل" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <a href="#top" className="font-display text-xl font-extrabold tracking-tight">
          {site.brand}
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href={site.kickUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-kick px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-105"
        >
          شاهد على كيك
        </a>
      </nav>
    </header>
  );
}
