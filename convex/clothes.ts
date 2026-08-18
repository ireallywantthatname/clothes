import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requirePasscode } from "./passcode";

const NICKNAME_MAX = 40;
const LIST_LIMIT = 200;

export const clothingItemValidator = v.object({
  id: v.id("clothes"),
  image_url: v.union(v.string(), v.null()),
  category: v.union(v.literal("top"), v.literal("bottom")),
  status: v.union(v.literal("available"), v.literal("unavailable")),
  nickname: v.union(v.string(), v.null()),
});

export function normalizeNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, NICKNAME_MAX);
}

export async function toClothingItem(
  ctx: QueryCtx | MutationCtx,
  doc: Doc<"clothes">,
) {
  return {
    id: doc._id,
    image_url: await ctx.storage.getUrl(doc.storageId),
    category: doc.category,
    status: doc.status,
    nickname: doc.nickname,
  };
}

export const list = query({
  args: { passcode: v.string() },
  returns: v.object({
    tops: v.array(clothingItemValidator),
    bottoms: v.array(clothingItemValidator),
  }),
  handler: async (ctx, args) => {
    requirePasscode(args.passcode);
    const [topDocs, bottomDocs] = await Promise.all([
      ctx.db
        .query("clothes")
        .withIndex("by_category", (q) => q.eq("category", "top"))
        .order("desc")
        .take(LIST_LIMIT),
      ctx.db
        .query("clothes")
        .withIndex("by_category", (q) => q.eq("category", "bottom"))
        .order("desc")
        .take(LIST_LIMIT),
    ]);
    const [tops, bottoms] = await Promise.all([
      Promise.all(topDocs.map((doc) => toClothingItem(ctx, doc))),
      Promise.all(bottomDocs.map((doc) => toClothingItem(ctx, doc))),
    ]);
    return { tops, bottoms };
  },
});

export const generateUploadUrl = mutation({
  args: { passcode: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    requirePasscode(args.passcode);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    passcode: v.string(),
    storageId: v.id("_storage"),
    category: v.union(v.literal("top"), v.literal("bottom")),
    nickname: v.union(v.string(), v.null()),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ error: v.string() }),
  ),
  handler: async (ctx, args) => {
    requirePasscode(args.passcode);
    try {
      await ctx.db.insert("clothes", {
        storageId: args.storageId,
        category: args.category,
        status: "available",
        nickname: normalizeNickname(args.nickname),
      });
    } catch (e: unknown) {
      await ctx.storage.delete(args.storageId);
      return { error: `Failed to save: ${(e as Error).message}` };
    }
    return { success: true as const };
  },
});

export const updateNickname = mutation({
  args: {
    passcode: v.string(),
    itemId: v.id("clothes"),
    nickname: v.union(v.string(), v.null()),
  },
  returns: v.union(
    v.object({ success: v.literal(true), nickname: v.union(v.string(), v.null()) }),
    v.object({ error: v.string() }),
  ),
  handler: async (ctx, args) => {
    requirePasscode(args.passcode);
    const item = await ctx.db.get("clothes", args.itemId);
    if (!item) return { error: "Item not found." };
    const nickname = normalizeNickname(args.nickname);
    await ctx.db.patch("clothes", args.itemId, { nickname });
    return { success: true as const, nickname };
  },
});

export const toggleStatus = mutation({
  args: {
    passcode: v.string(),
    itemId: v.id("clothes"),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ error: v.string() }),
  ),
  handler: async (ctx, args) => {
    requirePasscode(args.passcode);
    const item = await ctx.db.get("clothes", args.itemId);
    if (!item) return { error: "Item not found." };
    const status = item.status === "available" ? "unavailable" : "available";
    await ctx.db.patch("clothes", args.itemId, { status });
    return { success: true as const };
  },
});

export const remove = mutation({
  args: {
    passcode: v.string(),
    itemId: v.id("clothes"),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ error: v.string() }),
  ),
  handler: async (ctx, args) => {
    requirePasscode(args.passcode);
    const item = await ctx.db.get("clothes", args.itemId);
    if (!item) return { error: "Item not found." };

    const related =
      item.category === "top"
        ? await ctx.db
            .query("matches")
            .withIndex("by_topId", (q) => q.eq("topId", args.itemId))
            .take(LIST_LIMIT)
        : await ctx.db
            .query("matches")
            .withIndex("by_bottomId", (q) => q.eq("bottomId", args.itemId))
            .take(LIST_LIMIT);

    for (const match of related) {
      await ctx.db.delete("matches", match._id);
    }
    await ctx.storage.delete(item.storageId);
    await ctx.db.delete("clothes", args.itemId);
    return { success: true as const };
  },
});
