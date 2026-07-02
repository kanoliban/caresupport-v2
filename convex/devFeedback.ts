import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const GITHUB_REPO = "kanoliban/caresupport-v2";
const GITHUB_LABEL = "founder-feedback";

export const recordFeedback = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    category: v.string(),
    summary: v.string(),
    quote: v.optional(v.string()),
    sourceMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("devFeedback", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const setIssueRef = internalMutation({
  args: {
    feedbackId: v.id("devFeedback"),
    githubIssueUrl: v.string(),
    githubIssueNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      githubIssueUrl: args.githubIssueUrl,
      githubIssueNumber: args.githubIssueNumber,
    });
  },
});

export const createGithubIssue = internalAction({
  args: {
    feedbackId: v.id("devFeedback"),
    category: v.string(),
    summary: v.string(),
    quote: v.optional(v.string()),
    sourceMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const token = process.env.GITHUB_FEEDBACK_TOKEN;
    if (!token) {
      console.error("[devFeedback] GITHUB_FEEDBACK_TOKEN not set; issue not filed");
      return { filed: false, reason: "env_missing" };
    }

    const bodyLines = [
      "Filed automatically from a founder text to CareSupport.",
      "",
      `**Category:** ${args.category}`,
    ];
    if (args.quote) {
      bodyLines.push("", "**Founder's words:**", `> ${args.quote}`);
    }
    if (args.sourceMessage && args.sourceMessage !== args.quote) {
      bodyLines.push("", "**Full message:**", `> ${args.sourceMessage}`);
    }
    bodyLines.push("", `_devFeedback id: ${args.feedbackId}_`);

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "caresupport-runtime",
        },
        body: JSON.stringify({
          title: `[${args.category}] ${args.summary.slice(0, 120)}`,
          body: bodyLines.join("\n"),
          labels: [GITHUB_LABEL, `feedback:${args.category}`],
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[devFeedback] GitHub issue creation failed", {
        status: res.status,
        error: errText.slice(0, 300),
      });
      return { filed: false, reason: `github_${res.status}` };
    }

    const issue = (await res.json()) as { html_url: string; number: number };
    await ctx.runMutation(internal.devFeedback.setIssueRef, {
      feedbackId: args.feedbackId,
      githubIssueUrl: issue.html_url,
      githubIssueNumber: issue.number,
    });
    console.log("[devFeedback] filed issue", {
      number: issue.number,
      url: issue.html_url,
    });
    return { filed: true, url: issue.html_url };
  },
});
