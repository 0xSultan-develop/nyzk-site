/**
 * Central site config. Edit handles, links, and character data here.
 * Anything left empty / marked `soon` renders a "Soon" state on the site.
 */

export const KICK_SLUG = process.env.KICK_CHANNEL_SLUG ?? "nyzzk";

export const site = {
  brand: "NyZk",
  tagline: "#1",
  kickUrl: `https://kick.com/${KICK_SLUG}`,
};

export type Social = {
  key: string;
  label: string;
  handle: string;
  url: string;
  /** brand color used for the hover glow */
  color: string;
  /** path under /public for the 3D icon — add later; falls back to a glyph */
  icon3d?: string;
};

const tiktok = process.env.NEXT_PUBLIC_TIKTOK_USERNAME ?? "..rh32";
const x = process.env.NEXT_PUBLIC_X_USERNAME ?? "nyzk65";

export const socials: Social[] = [
  {
    key: "kick",
    label: "Kick",
    handle: KICK_SLUG,
    url: `https://kick.com/${KICK_SLUG}`,
    color: "#53fc18",
    icon3d: "/icons3d/kick.png",
  },
  {
    key: "instagram",
    label: "Instagram",
    handle: "nyzk_6",
    url: "https://www.instagram.com/nyzk_6",
    color: "#e1306c",
    icon3d: "/icons3d/instagram.png",
  },
  {
    key: "tiktok",
    label: "TikTok",
    handle: tiktok,
    url: `https://www.tiktok.com/@${tiktok}`,
    // 3D icon is black — a neutral halo suits it better than the cyan brand color
    color: "#e6e6ee",
    icon3d: "/icons3d/tiktok.png",
  },
  {
    key: "x",
    label: "X",
    handle: x,
    url: `https://x.com/${x}`,
    color: "#ffffff",
    icon3d: "/icons3d/x.png",
  },
  {
    key: "snapchat",
    label: "Snapchat",
    handle: "nyzk_6",
    url: "https://www.snapchat.com/@nyzk_6",
    color: "#fffc00",
    icon3d: "/icons3d/snapchat.png",
  },
  {
    key: "discord",
    label: "Discord",
    handle: "discord.gg/nyzk",
    url: "https://discord.gg/nyzk",
    color: "#5865f2",
    icon3d: "/icons3d/discord.png",
  },
];

export type Character = {
  id: string;
  name: string;
  /** short line shown on the card face */
  role?: string;
  /** tiny category label shown on the card (e.g. "Main", "Alter Ego") */
  tag?: string;
  /** one-line signature quote shown in the expanded view */
  quote?: string;
  /** full bio revealed on expand; empty => "Soon" */
  bio?: string;
  /** stats/traits revealed on expand */
  traits?: { label: string; value: string }[];
  /** cutout image (no background) under /public/characters — add later */
  image?: string;
  accent?: string;
};

/**
 * NyZk characters. Fill real names/bios/images later.
 * Cards show only the name until clicked; then the full info unfolds.
 */
export const characters: Character[] = [
  {
    id: "rayan-vorhees",
    name: "RAYAN VORHEES",
    quote: "",
    bio: "شخصية إجرامية. أخو OG VORHEES أكبر مجرم داخل البلدة الغامضة.",
    accent: "#a855f7",
    image: "/characters/rayan-vorhees.png",
    traits: [
      { label: "العائلة", value: "VORHEES" },
      { label: "العصابة", value: "Scrap Army" },
    ],
  },
];
