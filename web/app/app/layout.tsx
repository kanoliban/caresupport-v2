import type { Metadata, Viewport } from "next";
import { CompanionProviders } from "./_components/companion-providers";

export const metadata: Metadata = {
  title: "CareSupport",
  description:
    "The agent's visible mind — care coordination at your fingertips.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CareSupport",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F55A2A",
};

export default function CompanionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-cs-bg text-cs-text font-cs overflow-hidden">
      <CompanionProviders>{children}</CompanionProviders>
    </div>
  );
}
