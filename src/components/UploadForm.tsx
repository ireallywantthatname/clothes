"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadClothing } from "@/app/actions";

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileChange = (selectedFile: File | null) => {
    // Revoke old preview
    if (preview) URL.revokeObjectURL(preview);

    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setStatus({ type: "idle" });
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

    if (!file || !category) {
      setStatus({
        type: "error",
        message: "Please select an image and a category.",
      });
      return;
    }

    setStatus({ type: "uploading" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const result = await uploadClothing(formData);

    if (result.error) {
      setStatus({ type: "error", message: result.error });
    } else {
      setStatus({ type: "success", message: "Uploaded!" });
      router.refresh();
      // Navigate back to main page after a short delay
      setTimeout(() => {
        router.push("/");
      }, 800);
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
      <h1 className="text-2xl font-bold text-blossom-700">Add Clothes</h1>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full h-56 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
          dragOver
            ? "border-blossom-500 bg-blossom-100"
            : preview
              ? "border-blossom-300 bg-blossom-50"
              : "border-blossom-200 hover:border-blossom-400 hover:bg-blossom-50"
        }`}
      >
        {preview ? (
          <div className="relative h-full w-full flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="max-h-full max-w-full object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFileChange(null);
                if (fileInputRef.current)
                  fileInputRef.current.value = "";
              }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center hover:bg-red-50 transition-colors"
              aria-label="Remove image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-red-400"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-blossom-400 p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-10 h-10"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm font-medium">
              {dragOver ? "Drop it here!" : "Tap to select a photo"}
            </p>
            <p className="text-xs">or drag and drop</p>
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
        <p className="text-sm font-medium text-blossom-600 mb-2">Category</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCategory("top")}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              category === "top"
                ? "bg-blossom-500 text-white shadow-md"
                : "bg-blossom-50 text-blossom-500 hover:bg-blossom-100"
            }`}
          >
            👕 Top
          </button>
          <button
            type="button"
            onClick={() => setCategory("bottom")}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              category === "bottom"
                ? "bg-blossom-500 text-white shadow-md"
                : "bg-blossom-50 text-blossom-500 hover:bg-blossom-100"
            }`}
          >
            👖 Bottom
          </button>
        </div>
      </div>

      {/* Status messages */}
      {status.type === "error" && status.message && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg w-full text-center">
          {status.message}
        </p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
          canSubmit
            ? "bg-blossom-600 hover:bg-blossom-700 active:scale-[0.98] shadow-md"
            : "bg-blossom-300 cursor-not-allowed"
        }`}
      >
        {status.type === "uploading" ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
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
            Uploading...
          </span>
        ) : status.type === "success" ? (
          "Done! 🎉"
        ) : (
          "Add to Closet"
        )}
      </button>

      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/")}
        className="text-sm text-blossom-500 hover:text-blossom-700 transition-colors"
      >
        ← Back to closet
      </button>
    </form>
  );
}
