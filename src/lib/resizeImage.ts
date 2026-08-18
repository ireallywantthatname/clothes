export async function resizeImage(
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

      if (
        img.naturalWidth <= maxDimension &&
        img.naturalHeight <= maxDimension
      ) {
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
          const name = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`;
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
