"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { usePasscode } from "@/lib/passcode";
import type { Id } from "../../convex/_generated/dataModel";
import {
  removeBackground,
  preloadBackgroundRemoval,
  formatBgError,
  subscribeBgPreloadStatus,
} from "@/lib/removeBackground";
import type {
  ProgressCallback,
  BgPreloadStatus,
} from "@/lib/removeBackground";
import ThemeToggle from "./ThemeToggle";

async function resizeImage(
  file: File,
  maxDimension: number,
  format: "image/jpeg" | "image/png" = "image/jpeg",
  quality?: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.naturalWidth <= maxDimension && img.naturalHeight <= maxDimension) {
        resolve(file);
        return;
      }

      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > h) {
        h = Math.round((h * maxDimension) / w);
        w = maxDimension;
      } else {
        w = Math.round((w * maxDimension) / h);
        h = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob returned null"));
            return;
          }
          const ext = format === "image/png" ? "png" : "jpg";
          const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
          resolve(new File([blob], name, { type: format }));
        },
        format,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export default function UploadForm() {
  const router = useRouter();
  const { passcode } = usePasscode();
  const generateUploadUrl = useMutation(api.clothes.generateUploadUrl);
  const createClothing = useMutation(api.clothes.create);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmitting = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<"top" | "bottom" | null>(null);
  const [nickname, setNickname] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: "idle" | "uploading" | "processing" | "error" | "success";
    message?: string;
  }>({ type: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [removeBg, setRemoveBg] = useState(false);
  const [preloadState, setPreloadState] = useState<BgPreloadStatus>({
    phase: "idle",
    progress: 0,
    label: "",
    device: null,
    error: null,
  });
  const [processingProgress, setProcessingProgress] = useState<{
    percent: number;
    label: string;
  }>({ percent: 0, label: "" });

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return subscribeBgPreloadStatus(setPreloadState);
  }, []);

  const handleToggleBgOn = useCallback(() => {
    setRemoveBg(true);
    setStatus({ type: "idle" });
    void preloadBackgroundRemoval().catch((err) => {
      setStatus({
        type: "error",
        message: formatBgError(
          err,
          "Background model failed to load. Try again or turn it off.",
        ),
      });
    });
  }, []);

  const handleToggleBgOff = useCallback(() => {
    setRemoveBg(false);
    if (status.type === "error") {
      setStatus({ type: "idle" });
    }
  }, [status.type]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (preview) URL.revokeObjectURL(preview);

    if (selectedFile && selectedFile.type.startsWith("image/")) {
      try {
        const resized = await resizeImage(selectedFile, 1024);
        setFile(resized);
        setPreview(URL.createObjectURL(resized));
        setStatus({ type: "idle" });
      } catch {
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setStatus({ type: "idle" });
      }
    } else if (selectedFile) {
      setFile(null);
      setPreview(null);
      setStatus({ type: "error", message: "Please select an image file." });
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting.current) return;

    if (!file || !category) {
      setStatus({
        type: "error",
        message: "Select an image and a category.",
      });
      return;
    }

    if (passcode === null) {
      setStatus({ type: "error", message: "Unlock the closet first." });
      return;
    }

    isSubmitting.current = true;
    setStatus({ type: "uploading" });

    try {
      let uploadFile = file;
      const trimmedNickname = nickname.trim();

      if (removeBg) {
        setStatus({ type: "processing" });
        setProcessingProgress({ percent: 0, label: "" });
        try {
          await preloadBackgroundRemoval();
          const bgInput = await resizeImage(file, 800, "image/png");
          const progressCb: ProgressCallback = (key, current, total) => {
            const percent =
              total > 0 ? Math.round((current / total) * 100) : 0;
            setProcessingProgress({ percent, label: key });
          };
          const bgBlob = await removeBackground(bgInput, {
            onProgress: progressCb,
          });
          uploadFile = new File(
            [bgBlob],
            file.name.replace(/\.[^.]+$/, "") + ".png",
            { type: "image/png" },
          );
        } catch (err) {
          setStatus({
            type: "error",
            message: formatBgError(
              err,
              "Background removal failed. Try again or turn it off.",
            ),
          });
          isSubmitting.current = false;
          return;
        }
        setStatus({ type: "uploading" });
      }

      const postUrl = await generateUploadUrl({ passcode });
      const uploadResult = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": uploadFile.type },
        body: uploadFile,
      });
      if (!uploadResult.ok) {
        setStatus({
          type: "error",
          message: "Failed to upload file.",
        });
        return;
      }
      const { storageId } = (await uploadResult.json()) as {
        storageId: Id<"_storage">;
      };

      const result = await createClothing({
        passcode,
        storageId,
        category,
        nickname: trimmedNickname || null,
      });

      if ("error" in result) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({ type: "success", message: "Uploaded" });
        setTimeout(() => {
          router.push("/");
        }, 800);
      }
    } finally {
      isSubmitting.current = false;
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragOver(true);
    } else if (e.type === "dragleave") {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const canSubmit =
    file &&
    category &&
    status.type !== "uploading" &&
    status.type !== "processing";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-stretch gap-6 w-full max-w-md mx-auto"
    >
      {/* Page chrome matching home */}
      <div className="flex items-end justify-between border-b border-mono-200 pb-4">
        <div className="flex flex-col gap-1">
          <p className="label-caps text-[0.65rem]">New piece</p>
          <h1 className="font-mono text-2xl font-medium text-mono-900 tracking-[0.18em] leading-none">
            ADD CLOTHES
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="font-mono text-xs tracking-wider text-mono-500 hover:text-mono-900 transition-colors btn-press"
          >
            ← BACK
          </Link>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Select a clothing photo"
        className={`w-full h-56 flex flex-col items-center justify-center border-2 cursor-pointer transition-[border-color,background-color] duration-200 ${
          dragOver
            ? "border-mono-900 bg-mono-100"
            : preview
              ? "border-mono-200 product-stage"
              : "border-dashed border-mono-200 bg-mono-50 hover:border-mono-500"
        }`}
      >
        {preview ? (
          <div className="relative h-full w-full flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Selected clothing preview"
              className="max-h-full max-w-full object-contain"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFileChange(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute top-2 right-2 w-8 h-8 bg-mono-0 border border-mono-200 flex items-center justify-center hover:bg-mono-100 transition-colors btn-press"
              aria-label="Remove image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-mono-500"
                aria-hidden="true"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 text-mono-500 p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-9 h-9 text-mono-300"
              strokeWidth={1.25}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm text-mono-700">
              {dragOver ? "Drop it here" : "Tap to select a photo"}
            </p>
            <p className="text-xs text-mono-300">or drag and drop</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>

      {/* Category selector */}
      <fieldset className="w-full border-0 p-0 m-0">
        <legend className="label-caps mb-2.5">Category</legend>
        <div className="seg-track">
          <button
            type="button"
            onClick={() => setCategory("top")}
            className={`seg-item ${
              category === "top" ? "seg-item-active" : "seg-item-idle"
            }`}
            aria-pressed={category === "top"}
          >
            TOP
          </button>
          <button
            type="button"
            onClick={() => setCategory("bottom")}
            className={`seg-item ${
              category === "bottom" ? "seg-item-active" : "seg-item-idle"
            }`}
            aria-pressed={category === "bottom"}
          >
            BOTTOM
          </button>
        </div>
      </fieldset>

      {/* Nickname — optional hang-tag name for the piece */}
      <div className="w-full">
        <label htmlFor="upload-nickname" className="label-caps mb-2.5 block">
          Nickname
          <span className="ml-2 normal-case tracking-normal text-mono-300">
            optional
          </span>
        </label>
        <input
          id="upload-nickname"
          type="text"
          value={nickname}
          maxLength={40}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. navy henley"
          autoComplete="off"
          className="field-input"
          disabled={
            status.type === "uploading" || status.type === "processing"
          }
        />
        <p className="mt-1.5 font-mono text-[0.65rem] tracking-wider text-mono-300">
          {nickname.trim().length}/40
        </p>
      </div>

      {/* BG Removal toggle */}
      {preview && (
        <fieldset className="w-full border-0 p-0 m-0">
          <legend className="label-caps mb-2.5">Background removal</legend>
          <div className="seg-track">
            <button
              type="button"
              onClick={handleToggleBgOn}
              disabled={status.type === "processing"}
              className={`seg-item ${
                removeBg ? "seg-item-active" : "seg-item-idle"
              }`}
              aria-pressed={removeBg}
            >
              ON
            </button>
            <button
              type="button"
              onClick={handleToggleBgOff}
              disabled={status.type === "processing"}
              className={`seg-item ${
                !removeBg ? "seg-item-active" : "seg-item-idle"
              }`}
              aria-pressed={!removeBg}
            >
              OFF
            </button>
          </div>
          {removeBg && preloadState.phase === "loading" && (
            <div className="mt-3 w-full">
              <div className="flex justify-between font-mono text-xs text-mono-500 mb-1.5 tracking-wider">
                <span>
                  LOADING MODEL
                  {preloadState.device
                    ? ` · ${preloadState.device.toUpperCase()}`
                    : ""}
                </span>
                <span className="tabular-nums">{preloadState.progress}%</span>
              </div>
              <div className="progress-track" role="progressbar" aria-valuenow={preloadState.progress} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="progress-fill"
                  style={{ width: `${preloadState.progress}%` }}
                />
              </div>
            </div>
          )}
          {removeBg && preloadState.phase === "ready" && (
            <p className="text-xs text-mono-500 mt-2">
              Model ready
              {preloadState.device
                ? ` · ${preloadState.device.toUpperCase()}`
                : ""}
            </p>
          )}
          {removeBg && preloadState.phase === "error" && preloadState.error && (
            <p className="text-xs text-mono-900 mt-2 border border-mono-900 px-2.5 py-1.5" role="alert">
              {preloadState.error}
            </p>
          )}
        </fieldset>
      )}

      {status.type === "error" && status.message && (
        <div
          className="w-full border-2 border-mono-900 bg-mono-0 px-4 py-2.5 text-center"
          role="alert"
        >
          <p className="text-sm text-mono-900 text-pretty">{status.message}</p>
        </div>
      )}

      {status.type === "processing" && (
        <div className="w-full">
          <div className="flex justify-between font-mono text-xs text-mono-500 mb-1.5 tracking-wider">
            <span>PROCESSING</span>
            <span className="tabular-nums">{processingProgress.percent}%</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={processingProgress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-fill"
              style={{ width: `${processingProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-3.5 text-sm tracking-widest font-mono transition-[background-color,transform] duration-200 ${
          canSubmit
            ? "btn-primary active:scale-[0.99]"
            : "bg-mono-200 text-mono-500 cursor-not-allowed"
        }`}
      >
        {status.type === "processing" ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="inline-block h-3.5 w-3.5 border border-mono-0/40 border-t-mono-0 rounded-full animate-spin"
              aria-hidden="true"
            />
            REMOVING BG
          </span>
        ) : status.type === "uploading" ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="inline-block h-3.5 w-3.5 border border-mono-0/40 border-t-mono-0 rounded-full animate-spin"
              aria-hidden="true"
            />
            UPLOADING
          </span>
        ) : status.type === "success" ? (
          "DONE"
        ) : (
          "ADD TO CLOSET"
        )}
      </button>
    </form>
  );
}
