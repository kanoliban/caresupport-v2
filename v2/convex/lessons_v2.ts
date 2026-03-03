import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";

function pseudoEmbedding(text: string, dimensions = 16): number[] {
  const values = new Array<number>(dimensions).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    const bucket = i % dimensions;
    values[bucket] = ((values[bucket] * 31 + text.charCodeAt(i)) % 1000) / 1000;
  }
  return values;
}

export const upsertLesson = mutation({
  args: {
    familyId: v.optional(v.string()),
    scope: v.union(v.literal("global"), v.literal("family")),
    category: v.union(v.literal("behavioral"), v.literal("factual"), v.literal("operational")),
    text: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("lessons", {
      familyId: args.familyId,
      scope: args.scope,
      category: args.category,
      text: args.text,
      source: args.source,
      createdAt: now,
    });
    return { ok: true };
  },
});

export const listLessonsMissingEmbeddings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));
    const lessons = await ctx.db.query("lessons").collect();
    return lessons
      .filter((lesson) => !lesson.embedding || lesson.embedding.length === 0)
      .slice(0, limit)
      .map((lesson) => ({
        id: lesson._id,
        text: lesson.text,
      }));
  },
});

export const setLessonEmbedding = mutation({
  args: {
    id: v.id("lessons"),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      embedding: args.embedding,
      embeddingModel: args.embeddingModel,
    });
    return { ok: true };
  },
});

export const backfillEmbeddings = action({
  args: {
    limit: v.optional(v.number()),
    embeddingModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));
    const embeddingModel = args.embeddingModel ?? "hash-v1";
    const pending = await ctx.runQuery("lessons_v2:listLessonsMissingEmbeddings", {
      limit,
    });

    let updated = 0;
    for (const lesson of pending) {
      await ctx.runMutation("lessons_v2:setLessonEmbedding", {
        id: lesson.id,
        embedding: pseudoEmbedding(lesson.text),
        embeddingModel,
      });
      updated += 1;
    }

    return {
      scanned: pending.length,
      updated,
      embeddingModel,
    };
  },
});
