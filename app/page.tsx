import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Characters } from "@/components/Characters";
import { LiveStream } from "@/components/LiveStream";
import { Clips } from "@/components/Clips";
import { Stats } from "@/components/Stats";
import { Socials } from "@/components/Socials";
import { Footer } from "@/components/Footer";
import { getKickChannel, getKickClips } from "@/lib/kick";
import { getSiteStats } from "@/lib/stats";
import { KICK_SLUG } from "@/lib/site";


export default async function Home() {
  const [channel, clips, stats] = await Promise.all([
    getKickChannel(KICK_SLUG),
    getKickClips(KICK_SLUG),
    getSiteStats(),
  ]);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Characters />
        <LiveStream initial={channel} />
        <Clips clips={clips} />
        <Stats stats={stats} />
        <Socials />
      </main>
      <Footer />
    </>
  );
}
