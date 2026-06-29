"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadClothing } from "@/app/actions";

async function resizeImage(file: File, maxDimension: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Already small enough — return original unchanged
      if (img.naturalWidth <= maxDimension && img.naturalHeight <= maxDimension) {
        resolve(file);
        return;
      }

      // Calculate new dimensions preserving aspect ratio
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
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.8,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmitting = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<"top" | "bottom" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: "idle" | "uploading" | "error" | "success";
    message?: string;
  }>({ type: "idle" });
  const [dragOver, setDragOver] = useState(false);

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (selectedFile: File | null) => {
    if (preview) URL.revokeObjectURL(preview);

    if (selectedFile && selectedFile.type.startsWith("image/")) {
      try {
        const resized = await resizeImage(selectedFile, 1200);
        setFile(resized);
        setPreview(URL.createObjectURL(resized));
        setStatus({ type: "idle" });
      } catch {
        // Fall back to original file if resize fails
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

    isSubmitting.current = true;
    setStatus({ type: "uploading" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const result = await uploadClothing(formData);

      if (result.error) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({ type: "success", message: "Uploaded!" });
        router.refresh();
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
      className="flex flex-col items-center gap-6 w-full max-w-md mx-auto"
    >
      <h1
        className="text-xl tracking-wider text-mono-900"
        style={{ fontFamily: "var(--font-dm-mono)" }}
      >
        ADD CLOTHES
      </h1>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full h-56 flex flex-col items-center justify-center border-2 cursor-pointer transition-colors ${
          dragOver
            ? "border-mono-900 bg-mono-100"
            : preview
              ? "border-mono-200 bg-mono-50"
              : "border-mono-200 hover:border-mono-500"
        }`}
      >
        {preview ? (
          <div className="relative h-full w-full flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFileChange(null);
                if (fileInputRef.current)
                  fileInputRef.current.value = "";
              }}
              className="absolute top-2 right-2 w-8 h-8 bg-white border border-mono-300 flex items-center justify-center hover:bg-mono-100 transition-colors"
              aria-label="Remove image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-mono-500"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-mono-500 p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-10 h-10"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm">
              {dragOver ? "Drop it here" : "Tap to select a photo"}
            </p>
            <p className="text-xs text-mono-500/60">or drag and drop</p>
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
      <div className="w-full">
        <p
          className="text-xs tracking-widest text-mono-500 mb-2"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          CATEGORY
        </p>
        <div className="flex gap-px bg-mono-200">
          <button
            type="button"
            onClick={() => setCategory("top")}
            className={`flex-1 py-3 text-sm tracking-wider transition-colors ${
              category === "top"
                ? "bg-mono-900 text-white"
                : "bg-white text-mono-500 hover:bg-mono-100"
            }`}
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            TOP
          </button>
          <button
            type="button"
            onClick={() => setCategory("bottom")}
            className={`flex-1 py-3 text-sm tracking-wider transition-colors ${
              category === "bottom"
                ? "bg-mono-900 text-white"
                : "bg-white text-mono-500 hover:bg-mono-100"
            }`}
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            BOTTOM
          </button>
        </div>
      </div>

      {/* Status messages */}
      {status.type === "error" && status.message && (
        <div className="w-full border-2 border-mono-900 bg-white px-4 py-2 text-center">
          <p className="text-sm text-mono-900">{status.message}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!canSubmit}
        style={{ fontFamily: "var(--font-dm-mono)" }}
        className={`w-full py-3 text-sm tracking-widest text-white transition-colors ${
          canSubmit
            ? "bg-mono-900 hover:bg-mono-950"
            : "bg-mono-200 text-mono-500 cursor-not-allowed"
        }`}
      >
        {status.type === "uploading" ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            UPLOADING
          </span>
        ) : status.type === "success" ? (
          "DONE"
        ) : (
          "ADD TO CLOSET"
        )}
      </button>

      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/")}
        className="text-xs text-mono-500 hover:text-mono-900 transition-colors"
      >
        &larr; Back
      </button>
    </form>
  );
}
