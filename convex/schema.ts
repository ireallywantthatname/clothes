import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  clothes: defineTable({
    storageId: v.id("_storage"),
    category: v.union(v.literal("top"), v.literal("bottom")),
    status: v.union(v.literal("available"), v.literal("unavailable")),
    nickname: v.union(v.string(), v.null()),
    bgStatus: v.optional(
      v.union(v.literal("pending"), v.literal("done"), v.literal("failed")),
    ),
  })
    .index("by_category", ["category"])
    .index("by_bgStatus", ["bgStatus"]),
  matches: defineTable({
    topId: v.id("clothes"),
    bottomId: v.id("clothes"),
  })
    .index("by_topId_and_bottomId", ["topId", "bottomId"])
    .index("by_topId", ["topId"])
    .index("by_bottomId", ["bottomId"]),
});
