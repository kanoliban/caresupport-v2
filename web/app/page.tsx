import { FeatureSections, Faq } from "./_components/feature-sections";
import { Hero } from "./_components/hero";
import { SiteFooter } from "./_components/site-footer";
import { SiteNav } from "./_components/site-nav";
import { WaitlistCta } from "./_components/waitlist-cta";
import { getSignupCount } from "@/lib/waitlist-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialCount = await getSignupCount();
  return (
    <>
      <SiteNav />
      <main id="top" className="flex-1 sky-canvas">
        <Hero />
        <FeatureSections />
        <WaitlistCta initialCount={initialCount} />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
