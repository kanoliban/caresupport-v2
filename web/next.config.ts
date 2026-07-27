import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Widen the workspace root to the repo root so the companion app
    // (web/app/app) can import the Convex generated API from ../convex/.
    // Pinning to web/ alone made `@convex/*` aliases unresolvable.
    root: path.join(__dirname, ".."),
  },
  async redirects() {
    return [
      // 307, not 308: docs/VISION.md intends /start to become a real
      // onboarding page. A permanent redirect would be cached by browsers
      // and search engines and would outlive this anchor.
      { source: "/start", destination: "/#start", permanent: false },
    ];
  },
};

export default nextConfig;
