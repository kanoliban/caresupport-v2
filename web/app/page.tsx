import { Hero } from "./_components/hero";
import { Manifesto } from "./_components/manifesto";
import { SiteFooter } from "./_components/site-footer";
import { getSignupCount } from "@/lib/waitlist-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialCount = await getSignupCount();
  return (
    <>
      <main id="top" className="flex-1 sky-canvas">
        <Hero initialCount={initialCount} />
        <Manifesto />
      </main>
      <SiteFooter />
    </>
  );
}
