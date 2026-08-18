import type { Id } from "../../convex/_generated/dataModel";

export type ClothingItem = {
  id: Id<"clothes">;
  image_url: string | null;
  category: "top" | "bottom";
  status: "available" | "unavailable";
  nickname: string | null;
};

export type Match = {
  id: Id<"matches">;
  top_id: Id<"clothes">;
  bottom_id: Id<"clothes">;
  top?: ClothingItem;
  bottom?: ClothingItem;
};
