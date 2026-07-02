import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for waitlist storage.");
}

// Display offset added to the live Convex count. Set by founder to reflect
// pre-launch signups collected outside this form (private cohort, manual list).
const DISPLAY_OFFSET = 23;

let cachedClient: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  if (!cachedClient) cachedClient = new ConvexHttpClient(CONVEX_URL!);
  return cachedClient;
}

export interface SubmitInput {
  email: string;
  phone: string;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  landingPath?: string;
}

export interface SubmitResult {
  count: number;
}

export async function submitSignup(input: SubmitInput): Promise<SubmitResult> {
  const result = await getClient().mutation(api.waitlist.submitSignup, {
    email: input.email,
    phone: input.phone,
    userAgent: input.userAgent,
    referrer: input.referrer,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    utmContent: input.utmContent,
    landingPath: input.landingPath,
  });
  return { count: result.count + DISPLAY_OFFSET };
}

export async function getSignupCount(): Promise<number> {
  try {
    const count = await getClient().query(api.waitlist.getSignupCount, {});
    return count + DISPLAY_OFFSET;
  } catch (err) {
    console.warn(
      "Unable to load live waitlist count; using display offset fallback.",
      err,
    );
    return DISPLAY_OFFSET;
  }
}
