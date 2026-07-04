export type ProgressCallback = (
  key: string,
  current: number,
  total: number,
) => void;

let preloadPromise: Promise<void> | null = null;
let preloaded = false;

export function preloadBackgroundRemoval(
  onProgress?: ProgressCallback,
): void {
  if (preloaded || preloadPromise) return;
  preloadPromise = (async () => {
    const { preload } = await import("@imgly/background-removal");
    await preload({
      model: "isnet_quint8",
      device: "gpu",
      progress: onProgress,
    });
    preloaded = true;
  })();
}

export async function removeBackground(
  image: Blob,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const { removeBackground: imglyRemoveBackground } = await import(
    "@imgly/background-removal"
  );

  return imglyRemoveBackground(image, {
    model: "isnet_quint8",
    device: "gpu",
    output: {
      format: "image/png",
    },
    progress: onProgress,
  });
}
