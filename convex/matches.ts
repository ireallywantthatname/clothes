import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePasscode } from "./passcode";
import { clothingItemValidator, toClothingItem } from "./clothes";

const LIST_LIMIT = 200;

const matchValidator = v.object({
  id: v.id("matches"),
  top_id: v.id("clothes"),
  bottom_id: v.id("clothes"),
  top: v.optional(clothingItemValidator),
  bottom: v.optional(clothingItemValidator),
});

export const list = query({
  args: { passcode: v.string() },
  returns: v.array(matchValidator),
  handler: async (ctx, args) => {
    requirePasscode(args.passcode);
    const docs = await ctx.db
      .query("matches")
      .withIndex("by_creation_time")
      .order("desc")
      .take(LIST_LIMIT);
    const matches = [];
    for (const doc of docs) {
      const [topDoc, bottomDoc] = await Promise.all([
        ctx.db.get("clothes", doc.topId),
        ctx.db.get("clothes", doc.bottomId),
      ]);
      matches.push({
        id: doc._id,
        top_id: doc.topId,
        bottom_id: doc.bottomId,
        top: topDoc ? await toClothingItem(ctx, topDoc) : undefined,
        bottom: bottomDoc ? await toClothingItem(ctx, bottomDoc) : undefined,
      });
    }
    return matches;
  },
});

export const save = mutation({
  args: {
    passcode: v.string(),
    topId: v.id("clothes"),
    bottomId: v.id("clothes"),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ error: v.string() }),
  ),
  handler: async (ctx, args) => {
    requirePasscode(args.passcode);
    const [top, bottom] = await Promise.all([
      ctx.db.get("clothes", args.topId),
      ctx.db.get("clothes", args.bottomId),
    ]);
    if (!top || !bottom) {
      return { error: "One or both items no longer exist." };
    }
    if (top.category !== "top") {
      return { error: "The selected top is not categorized as a top." };
    }
    if (bottom.category !== "bottom") {
      return { error: "The selected bottom is not categorized as a bottom." };
    }
    const existing = await ctx.db
      .query("matches")
      .withIndex("by_topId_and_bottomId", (q) =>
        q.eq("topId", args.topId).eq("bottomId", args.bottomId),
      )
      .unique();
    if (existing) {
      return { error: "This combination is already saved." };
    }
    await ctx.db.insert("matches", {
      topId: args.topId,
      bottomId: args.bottomId,
    });
    return { success: true as const };
  },
});

export const remove = mutation({
  args: {
    passcode: v.string(),
    matchId: v.id("matches"),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ error: v.string() }),
  ),
  handler: async (ctx, args) => {
    requirePasscode(args.passcode);
    const match = await ctx.db.get("matches", args.matchId);
    if (!match) return { error: "No match specified." };
    await ctx.db.delete("matches", args.matchId);
    return { success: true as const };
  },
});
