"use server";

import { revalidatePath } from "next/cache";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import db from "@/lib/db";

const UPLOADS_DIR = "public/uploads";

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

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

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${category}-${crypto.randomUUID()}.${ext}`;
  const filepath = `${UPLOADS_DIR}/${filename}`;

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(filepath, buffer);

  const imageUrl = `/uploads/${filename}`;

  // Insert into database
  try {
    db.run("INSERT INTO clothes (id, image_url, category) VALUES (?, ?, ?)", [
      crypto.randomUUID(),
      imageUrl,
      category,
    ]);
  } catch (e: unknown) {
    return { error: `Failed to save: ${(e as Error).message}` };
  }

  revalidatePath("/");
  return { success: true };
}

export async function saveMatch(topId: string, bottomId: string) {
  if (!topId || !bottomId) {
    return { error: "Select a top and a bottom first." };
  }

  // Verify both items exist and have correct categories
  const items = db
    .query("SELECT id, category FROM clothes WHERE id IN (?, ?)")
    .all(topId, bottomId) as { id: string; category: string }[];

  if (items.length < 2) {
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
  try {
    db.run("INSERT INTO matches (id, top_id, bottom_id) VALUES (?, ?, ?)", [
      crypto.randomUUID(),
      topId,
      bottomId,
    ]);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.includes("UNIQUE")) {
      return { error: "This combination is already saved." };
    }
    return { error: `Failed to save match: ${msg}` };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteMatch(matchId: string) {
  if (!matchId) {
    return { error: "No match specified." };
  }

  db.run("DELETE FROM matches WHERE id = ?", [matchId]);

  revalidatePath("/");
  return { success: true };
}

export async function toggleItemStatus(itemId: string) {
  if (!itemId) return { error: "No item specified." };

  const row = db
    .query("SELECT status FROM clothes WHERE id = ?")
    .get(itemId) as { status: string } | null;

  if (!row) {
    return { error: "Item not found." };
  }

  const newStatus = row.status === "available" ? "unavailable" : "available";

  db.run("UPDATE clothes SET status = ? WHERE id = ?", [newStatus, itemId]);

  revalidatePath("/");
  return { success: true };
}

export async function deleteClothingItem(itemId: string, imageUrl: string) {
  if (!itemId) return { error: "No item specified." };

  // Delete image file from disk
  const filename = imageUrl.split("/").pop();
  if (filename) {
    const filepath = `${UPLOADS_DIR}/${filename}`;
    try {
      unlinkSync(filepath);
    } catch {
      // File may not exist — ignore
    }
  }

  // Delete from clothes (matches cascade via ON DELETE CASCADE FK)
  db.run("DELETE FROM clothes WHERE id = ?", [itemId]);

  revalidatePath("/");
  return { success: true };
}
