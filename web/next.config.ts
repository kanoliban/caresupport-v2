import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Widen the workspace root to the repo root so the companion app
    // (web/app/app) can import the Convex generated API from ../convex/.
    // Pinning to web/ alone made `@convex/*` aliases unresolvable.
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
