"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { usePasscode } from "@/lib/passcode";
import { takePendingBgFile } from "@/lib/pendingBgFiles";
import {
  preloadBackgroundRemoval,
  removeBackground,
} from "@/lib/removeBackground";
import { resizeImage } from "@/lib/resizeImage";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const inFlight = new Set<string>();
const finished = new Set<string>();

export function releaseBgQueueItem(id: string) {
  inFlight.delete(id);
  finished.delete(id);
}

async function fileFromUrl(url: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to download original photo.");
  }
  const blob = await response.blob();
  const type = blob.type || "image/jpeg";
  const ext = type.includes("png") ? "png" : "jpg";
  return new File([blob], `item.${ext}`, { type });
}

export default function BgRemovalProcessor() {
  const { passcode } = usePasscode();
  const pending = useQuery(
    api.clothes.listPendingBg,
    passcode === null ? "skip" : { passcode },
  );
  const generateUploadUrl = useMutation(api.clothes.generateUploadUrl);
  const replaceImage = useMutation(api.clothes.replaceImage);
  const failBgRemoval = useMutation(api.clothes.failBgRemoval);
  const [queueTick, setQueueTick] = useState(0);
  const generateUploadUrlRef = useRef(generateUploadUrl);
  const replaceImageRef = useRef(replaceImage);
  const failBgRemovalRef = useRef(failBgRemoval);

  useEffect(() => {
    generateUploadUrlRef.current = generateUploadUrl;
    replaceImageRef.current = replaceImage;
    failBgRemovalRef.current = failBgRemoval;
  }, [generateUploadUrl, replaceImage, failBgRemoval]);

  // biome-ignore lint/correctness/useExhaustiveDependencies(queueTick): advance the queue after each item finishes
  useEffect(() => {
    if (passcode === null || pending === undefined) return;

    const next = pending.find(
      (item) => !inFlight.has(item.id) && !finished.has(item.id),
    );
    if (!next) return;

    const itemId = next.id;
    const imageUrl = next.image_url;
    inFlight.add(itemId);

    void (async () => {
      try {
        let source = takePendingBgFile(itemId);
        if (!source) {
          if (!imageUrl) {
            throw new Error("Missing original photo.");
          }
          source = await fileFromUrl(imageUrl);
        }
        await preloadBackgroundRemoval();
        const bgInput = await resizeImage(source, 800, "image/png");
        const bgBlob = await removeBackground(bgInput);
        const postUrl = await generateUploadUrlRef.current({ passcode });
        const uploadResult = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: bgBlob,
        });
        if (!uploadResult.ok) {
          throw new Error("Failed to upload cutout.");
        }
        const { storageId } = (await uploadResult.json()) as {
          storageId: Id<"_storage">;
        };
        await replaceImageRef.current({
          passcode,
          itemId,
          storageId,
        });
      } catch {
        try {
          await failBgRemovalRef.current({ passcode, itemId });
        } catch {
          return;
        }
      } finally {
        finished.add(itemId);
        inFlight.delete(itemId);
        setQueueTick((n) => n + 1);
      }
    })();
  }, [passcode, pending, queueTick]);

  return null;
}
