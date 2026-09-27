import { site, socials } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-5 py-10 sm:flex-row sm:justify-between">
        <p className="font-display text-lg font-extrabold">
          {site.brand}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted">
          {socials
            .filter((s) => s.handle !== "soon")
            .map((s) => (
              <a
                key={s.key}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
        </div>
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} 0xSultan — جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
