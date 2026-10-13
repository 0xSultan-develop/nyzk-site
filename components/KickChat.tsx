"use client";

/**
 * Official Kick chat — embeds Kick's own popout chatroom in an iframe. It's the
 * real thing: live messages, emotes, badges, and (for viewers logged in to
 * Kick) sending messages too. No custom stream to maintain.
 */
import { KICK_SLUG } from "@/lib/site";

export function KickChat() {
  return (
    <iframe
      src={`https://kick.com/popout/${KICK_SLUG}/chat`}
      title="Kick chat"
      loading="lazy"
      allow="autoplay; encrypted-media; fullscreen"
      className="min-h-[480px] w-full flex-1 border-0 bg-black/40 lg:min-h-0"
      style={{ colorScheme: "dark" }}
    />
  );
}
