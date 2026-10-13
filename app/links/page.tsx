import type { Metadata } from "next";
import { Socials } from "@/components/Socials";

export const metadata: Metadata = {
  title: "NyZk — Social Media",
  description: "حسابات NyZk على السوشل ميديا",
};

// Standalone "link in bio" page: only the social accounts, no nav/hero/footer.
export default function LinksPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Socials />
    </main>
  );
}
