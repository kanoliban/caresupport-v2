"use client";

import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import { convexClient } from "../_lib/convex-client";

export function CompanionProviders({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
