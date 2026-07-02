import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for waitlist storage.");
}

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

export async function submitSignup(input: SubmitInput): Promise<void> {
  await getClient().mutation(api.waitlist.submitSignup, {
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
}
