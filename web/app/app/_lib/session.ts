"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Slice 1B: hardcoded dev session. The companion app resolves a known phone
 * (from NEXT_PUBLIC_DEV_PHONE) to a user via Convex's public users.getByPhone
 * query. Slice 1C swaps this for a real JWT session cookie + phone-based
 * magic-link auth.
 *
 * Returns:
 *   undefined → Convex query still loading
 *   null      → no user matches the dev phone (need to seed)
 *   User      → resolved
 */
export function useCurrentUser(): Doc<"users"> | null | undefined {
  const phone = process.env.NEXT_PUBLIC_DEV_PHONE;
  return useQuery(api.users.getByPhone, phone ? { phone } : "skip");
}

/**
 * The care case bound to the current user. Same loading semantics:
 * undefined while loading, null if missing.
 */
export function useCurrentCareCase(): Doc<"careCases"> | null | undefined {
  const user = useCurrentUser();
  return useQuery(
    api.careCases.get,
    user ? { id: user.careCaseId } : "skip",
  );
}
