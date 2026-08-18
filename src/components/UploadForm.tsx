"use client";

import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePasscode } from "@/lib/passcode";
import { stashPendingBgFile } from "@/lib/pendingBgFiles";
import { resizeImage } from "@/lib/resizeImage";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ThemeToggle from "./ThemeToggle";

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
    type: "idle" | "uploading" | "error" | "success";
    message?: string;
  }>({ type: "idle" });
  const [dragOver, setDragOver] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies(preview): revoke the mount-time object URL only
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, []);

  const handleFileChange = async (selectedFile: File | null) => {
    if (preview) URL.revokeObjectURL(preview);

    if (selectedFile?.type.startsWith("image/")) {
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
      const trimmedNickname = nickname.trim();

      const postUrl = await generateUploadUrl({ passcode });
      const uploadResult = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
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
        stashPendingBgFile(result.id, file);
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

  const canSubmit = file && category && status.type !== "uploading";

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
      {/* biome-ignore lint/a11y/useSemanticElements: drop zone also contains a remove control */}
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
            {/* biome-ignore lint/performance/noImgElement: local object-URL preview */}
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
          disabled={status.type === "uploading"}
        />
        <p className="mt-1.5 font-mono text-[0.65rem] tracking-wider text-mono-300">
          {nickname.trim().length}/40
        </p>
      </div>

      {status.type === "error" && status.message && (
        <div
          className="w-full border-2 border-mono-900 bg-mono-0 px-4 py-2.5 text-center"
          role="alert"
        >
          <p className="text-sm text-mono-900 text-pretty">{status.message}</p>
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
        {status.type === "uploading" ? (
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
