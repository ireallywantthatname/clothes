export type ClothingItem = {
  id: string;
  image_url: string;
  category: "top" | "bottom";
  status: "available" | "unavailable";
  /** Personal name for the piece (e.g. "navy henley"). Null when unset. */
  nickname: string | null;
  created_at: string;
};

export type Match = {
  id: string;
  top_id: string;
  bottom_id: string;
  created_at: string;
  top?: ClothingItem;
  bottom?: ClothingItem;
};
