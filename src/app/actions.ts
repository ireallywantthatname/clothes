"use server";

import { revalidatePath } from "next/cache";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { put, del } from "@vercel/blob";
import db from "@/lib/db";
import {
  isPasscodeUnlocked,
  passcodesMatch,
  setPasscodeUnlockedCookie,
} from "@/lib/passcode";

const UPLOADS_DIR = "data/uploads";
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

async function requireUnlocked(): Promise<{ error: string } | null> {
  if (!(await isPasscodeUnlocked())) {
    return { error: "Unlock the closet first." };
  }
  return null;
}

export async function verifyPasscode(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const expected = process.env.PASSCODE;
  if (!expected) {
    // Gate disabled — nothing to verify
    return { ok: true };
  }

  const trimmed = typeof code === "string" ? code.trim() : "";
  if (!trimmed) {
    return { ok: false, error: "Enter the passcode." };
  }

  if (!passcodesMatch(trimmed, expected)) {
    return { ok: false, error: "Wrong passcode." };
  }

  await setPasscodeUnlockedCookie();
  return { ok: true };
}


async function storeFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (USE_BLOB) {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType,
    });
    return blob.url;
  }
  // Local filesystem fallback
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  writeFileSync(`${UPLOADS_DIR}/${filename}`, buffer);
  return filename;
}

async function deleteFile(imageUrl: string): Promise<void> {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    await del(imageUrl);
    return;
  }
  // Local filesystem fallback
  const filepath = `${UPLOADS_DIR}/${imageUrl}`;
  try {
    unlinkSync(filepath);
  } catch {
    // File may not exist — ignore
  }
}

const NICKNAME_MAX = 40;

function normalizeNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, NICKNAME_MAX);
}

export async function uploadClothing(formData: FormData) {
  const locked = await requireUnlocked();
  if (locked) return locked;

  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string | null;
  const nickname = normalizeNickname(formData.get("nickname"));

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

  // Store file (blob or local)
  const buffer = Buffer.from(await file.arrayBuffer());
  let imageUrl: string;
  try {
    imageUrl = await storeFile(filename, buffer, file.type);
  } catch (e: unknown) {
    return { error: `Failed to upload file: ${(e as Error).message}` };
  }

  // Insert into database
  try {
    await db.execute({
      sql: "INSERT INTO clothes (id, image_url, category, nickname) VALUES (?, ?, ?, ?)",
      args: [crypto.randomUUID(), imageUrl, category, nickname],
    });
  } catch (e: unknown) {
    // Clean up the uploaded file on DB failure
    await deleteFile(imageUrl);
    return { error: `Failed to save: ${(e as Error).message}` };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateNickname(itemId: string, nickname: string | null) {
  const locked = await requireUnlocked();
  if (locked) return locked;

  if (!itemId) return { error: "No item specified." };

  const normalized = normalizeNickname(nickname);

  const result = await db.execute({
    sql: "SELECT id FROM clothes WHERE id = ?",
    args: [itemId],
  });
  if ((result.rows as unknown[]).length === 0) {
    return { error: "Item not found." };
  }

  await db.execute({
    sql: "UPDATE clothes SET nickname = ? WHERE id = ?",
    args: [normalized, itemId],
  });

  revalidatePath("/");
  return { success: true, nickname: normalized };
}

export async function saveMatch(topId: string, bottomId: string) {
  const locked = await requireUnlocked();
  if (locked) return locked;

  if (!topId || !bottomId) {
    return { error: "Select a top and a bottom first." };
  }

  // Verify both items exist and have correct categories
  const result = await db.execute({
    sql: "SELECT id, category FROM clothes WHERE id IN (?, ?)",
    args: [topId, bottomId],
  });
  const items = result.rows as unknown as { id: string; category: string }[];

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
    await db.execute({
      sql: "INSERT INTO matches (id, top_id, bottom_id) VALUES (?, ?, ?)",
      args: [crypto.randomUUID(), topId, bottomId],
    });
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
  const locked = await requireUnlocked();
  if (locked) return locked;

  if (!matchId) {
    return { error: "No match specified." };
  }

  await db.execute({
    sql: "DELETE FROM matches WHERE id = ?",
    args: [matchId],
  });

  revalidatePath("/");
  return { success: true };
}

export async function toggleItemStatus(itemId: string) {
  const locked = await requireUnlocked();
  if (locked) return locked;

  if (!itemId) return { error: "No item specified." };

  const result = await db.execute({
    sql: "SELECT status FROM clothes WHERE id = ?",
    args: [itemId],
  });
  const rows = result.rows as unknown as { status: string }[];
  const row = rows[0] ?? null;

  if (!row) {
    return { error: "Item not found." };
  }

  const newStatus = row.status === "available" ? "unavailable" : "available";

  await db.execute({
    sql: "UPDATE clothes SET status = ? WHERE id = ?",
    args: [newStatus, itemId],
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteClothingItem(itemId: string, imageUrl: string) {
  const locked = await requireUnlocked();
  if (locked) return locked;

  if (!itemId) return { error: "No item specified." };

  // Delete image file from storage
  await deleteFile(imageUrl);

  // Delete from clothes (matches cascade via ON DELETE CASCADE FK)
  await db.execute({
    sql: "DELETE FROM clothes WHERE id = ?",
    args: [itemId],
  });

  revalidatePath("/");
  return { success: true };
}
