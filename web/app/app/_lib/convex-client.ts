import { ConvexReactClient } from "convex/react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!url) {
  throw new Error(
    "Missing NEXT_PUBLIC_CONVEX_URL. Set it in web/.env.local to your Convex deployment URL (e.g. https://valiant-tortoise-962.convex.cloud).",
  );
}

export const convexClient = new ConvexReactClient(url);
