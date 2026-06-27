export type ClothingItem = {
  id: string;
  image_url: string;
  category: "top" | "bottom";
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
