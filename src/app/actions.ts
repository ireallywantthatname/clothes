"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadClothing(formData: FormData) {
  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string | null;

  if (!file || !(file instanceof File)) {
    return { error: "Please select an image file." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "File must be an image." };
  }

  if (category !== "top" && category !== "bottom") {
    return { error: "Please select a category (top or bottom)." };
  }

  const supabase = await createClient();

  // Generate a unique filename
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${category}-${crypto.randomUUID()}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("clothes-images")
    .upload(filename, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("clothes-images").getPublicUrl(filename);

  // Insert into clothes table
  const { error: insertError } = await supabase
    .from("clothes")
    .insert({ image_url: publicUrl, category });

  if (insertError) {
    return { error: `Failed to save: ${insertError.message}` };
  }

  revalidatePath("/");
  return { success: true };
}

export async function saveMatch(topId: string, bottomId: string) {
  if (!topId || !bottomId) {
    return { error: "Select a top and a bottom first." };
  }

  const supabase = await createClient();

  // Verify both items exist and have correct categories
  const { data: items, error: fetchError } = await supabase
    .from("clothes")
    .select("id, category")
    .in("id", [topId, bottomId]);

  if (fetchError || !items || items.length < 2) {
    return { error: "One or both items no longer exist." };
  }

  const top = items.find((i) => i.id === topId);
  const bottom = items.find((i) => i.id === bottomId);

  if (top?.category !== "top") {
    return { error: "The selected top is not categorized as a top." };
  }
  if (bottom?.category !== "bottom") {
    return { error: "The selected bottom is not categorized as a bottom." };
  }

  // Insert match (UNIQUE constraint prevents duplicates)
  const { error: insertError } = await supabase.from("matches").insert({
    top_id: topId,
    bottom_id: bottomId,
  });

  if (insertError) {
    // Postgres error code 23505 = unique_violation
    if (insertError.code === "23505") {
      return { error: "This combination is already saved." };
    }
    return { error: `Failed to save match: ${insertError.message}` };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteMatch(matchId: string) {
  if (!matchId) {
    return { error: "No match specified." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId);

  if (error) {
    return { error: `Failed to delete match: ${error.message}` };
  }

  revalidatePath("/");
  return { success: true };
}

export async function toggleItemStatus(itemId: string) {
  if (!itemId) return { error: "No item specified." };

  const supabase = await createClient();

  // Fetch current status
  const { data, error: fetchError } = await supabase
    .from("clothes")
    .select("status")
    .eq("id", itemId)
    .single();

  if (fetchError || !data) {
    return { error: "Item not found." };
  }

  const newStatus = data.status === "available" ? "unavailable" : "available";

  const { error } = await supabase
    .from("clothes")
    .update({ status: newStatus })
    .eq("id", itemId);

  if (error) {
    return { error: `Failed to update: ${error.message}` };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteClothingItem(itemId: string, imageUrl: string) {
  if (!itemId) return { error: "No item specified." };

  const supabase = await createClient();

  // Extract filename from public URL
  const urlParts = imageUrl.split("/");
  const filename = urlParts[urlParts.length - 1];

  if (filename) {
    await supabase.storage.from("clothes-images").remove([filename]);
  }

  // Delete from clothes (matches cascade via ON DELETE CASCADE)
  const { error } = await supabase.from("clothes").delete().eq("id", itemId);

  if (error) {
    return { error: `Failed to delete: ${error.message}` };
  }

  revalidatePath("/");
  return { success: true };
}
