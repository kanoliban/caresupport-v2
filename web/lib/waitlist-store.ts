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
}

export interface SubmitResult {
  count: number;
}

export async function submitSignup(input: SubmitInput): Promise<SubmitResult> {
  const result = await getClient().mutation(api.waitlist.submitSignup, {
    email: input.email,
    phone: input.phone,
    userAgent: input.userAgent,
  });
  return { count: result.count };
}

export async function getSignupCount(): Promise<number> {
  return await getClient().query(api.waitlist.getSignupCount, {});
}
