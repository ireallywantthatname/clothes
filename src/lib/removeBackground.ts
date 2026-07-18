/**
 * Client-side background removal wrapper around @imgly/background-removal.
 *
 * Reliability goals:
 * - Prefer WebGPU when available; fall back to CPU/WASM automatically
 * - Finite timeouts on preload and remove (no infinite hang)
 * - Clear, non-empty error messages for the UI
 * - Self-hosted model/wasm under /bg-removal/ (publicPath)
 */

export type ProgressCallback = (
  key: string,
  current: number,
  total: number,
) => void;

export type DeviceKind = "gpu" | "cpu";

export type BgPreloadPhase = "idle" | "loading" | "ready" | "error";

export type BgPreloadStatus = {
  phase: BgPreloadPhase;
  progress: number;
  label: string;
  device: DeviceKind | null;
  error: string | null;
};

export const MODEL = "isnet_quint8" as const;
export const DEFAULT_PRELOAD_TIMEOUT_MS = 120_000;
export const DEFAULT_REMOVE_TIMEOUT_MS = 90_000;

/** Directory under public/ where imgly model + wasm chunks live */
export const BG_ASSET_PUBLIC_PATH = "/bg-removal/";

type ImglyConfig = {
  model: typeof MODEL;
  device: DeviceKind;
  publicPath: string;
  output?: { format: "image/png" };
  progress?: ProgressCallback;
  /**
   * Not used by imgly at runtime (stripped by their zod schema) but included in
   * JSON.stringify(config), which is the key for their memoized init. Bumping
   * this after a failed attempt prevents permanently caching a rejected promise.
   */
  __memoBust?: number;
};

type ImglyModule = {
  preload: (config: ImglyConfig) => Promise<void>;
  removeBackground: (image: Blob, config: ImglyConfig) => Promise<Blob>;
};

type TestHooks = {
  loadImgly: () => Promise<ImglyModule>;
  detectWebGPU: () => Promise<boolean>;
};

const defaultLoadImgly: TestHooks["loadImgly"] = async () => {
  const m = await import("@imgly/background-removal");
  return {
    preload: m.preload as ImglyModule["preload"],
    removeBackground: m.removeBackground as ImglyModule["removeBackground"],
  };
};

async function defaultDetectWebGPU(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined") return false;
    const gpu = (
      navigator as Navigator & {
        gpu?: { requestAdapter?: () => Promise<unknown> };
      }
    ).gpu;
    if (!gpu?.requestAdapter) return false;
    const adapter = await gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

let hooks: TestHooks = {
  loadImgly: defaultLoadImgly,
  detectWebGPU: defaultDetectWebGPU,
};

let preloadPromise: Promise<DeviceKind> | null = null;
let preloadedDevice: DeviceKind | null = null;
/**
 * Generation counter mixed into imgly config so their
 * `memoize(initInference, config => JSON.stringify(config))` does not keep
 * serving a rejected init promise after a transient failure.
 */
let memoBustGeneration = 0;
let status: BgPreloadStatus = {
  phase: "idle",
  progress: 0,
  label: "",
  device: null,
  error: null,
};
const statusListeners = new Set<(s: BgPreloadStatus) => void>();

function setStatus(partial: Partial<BgPreloadStatus>): void {
  status = { ...status, ...partial };
  for (const listener of statusListeners) {
    listener(status);
  }
}

/** After a failed attempt, force the next imgly init to miss the poison cache. */
function markAttemptFailedForRetry(): void {
  memoBustGeneration += 1;
  preloadPromise = null;
  preloadedDevice = null;
}

/** Test helper: current memo-bust generation (for assertions). */
export function __getMemoBustGeneration(): number {
  return memoBustGeneration;
}

/** Absolute publicPath for imgly asset fetches (trailing slash required). */
export function resolvePublicPath(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${BG_ASSET_PUBLIC_PATH}`;
  }
  return BG_ASSET_PUBLIC_PATH;
}

/**
 * Prefer GPU when WebGPU is available; otherwise CPU/WASM.
 * Exported for tests and UI hints.
 */
export async function resolveDevice(): Promise<DeviceKind> {
  const hasGpu = await hooks.detectWebGPU();
  return hasGpu ? "gpu" : "cpu";
}

export function getBgPreloadStatus(): BgPreloadStatus {
  return status;
}

export function subscribeBgPreloadStatus(
  listener: (s: BgPreloadStatus) => void,
): () => void {
  statusListeners.add(listener);
  listener(status);
  return () => {
    statusListeners.delete(listener);
  };
}

/** Turn unknown failures into a short non-empty UI message. */
export function formatBgError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return fallback;
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) {
    return promise;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function baseConfig(
  device: DeviceKind,
  onProgress?: ProgressCallback,
): ImglyConfig {
  return {
    model: MODEL,
    device,
    publicPath: resolvePublicPath(),
    progress: onProgress,
    output: { format: "image/png" },
    // Busts @imgly memoize(init, JSON.stringify) after failed attempts.
    __memoBust: memoBustGeneration,
  };
}

async function runPreload(
  device: DeviceKind,
  onProgress?: ProgressCallback,
): Promise<void> {
  const imgly = await hooks.loadImgly();
  await imgly.preload(baseConfig(device, onProgress));
}

/**
 * Preload model assets. Resolves with the device that was successfully
 * prepared. Safe to call multiple times (shared promise). On failure the
 * promise is cleared so the next call retries.
 */
export function preloadBackgroundRemoval(
  onProgress?: ProgressCallback,
  options?: { timeoutMs?: number; device?: DeviceKind },
): Promise<DeviceKind> {
  if (preloadedDevice) {
    setStatus({
      phase: "ready",
      progress: 100,
      label: "ready",
      device: preloadedDevice,
      error: null,
    });
    return Promise.resolve(preloadedDevice);
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_PRELOAD_TIMEOUT_MS;

  preloadPromise = (async () => {
    const preferred = options?.device ?? (await resolveDevice());
    setStatus({
      phase: "loading",
      progress: 0,
      label: "",
      device: preferred,
      error: null,
    });

    const trackProgress: ProgressCallback = (key, current, total) => {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      setStatus({
        phase: "loading",
        progress: percent,
        label: key,
        device: preferred,
        error: null,
      });
      onProgress?.(key, current, total);
    };

    try {
      await withTimeout(
        runPreload(preferred, trackProgress),
        timeoutMs,
        `Background model load timed out after ${Math.round(timeoutMs / 1000)}s. Check your connection and try again.`,
      );
      preloadedDevice = preferred;
      setStatus({
        phase: "ready",
        progress: 100,
        label: "ready",
        device: preferred,
        error: null,
      });
      return preferred;
    } catch (gpuOrPreferredError) {
      // If we tried GPU, automatically fall back to CPU once.
      if (preferred === "gpu") {
        setStatus({
          phase: "loading",
          progress: 0,
          label: "retrying on cpu",
          device: "cpu",
          error: null,
        });
        try {
          await withTimeout(
            runPreload("cpu", trackProgress),
            timeoutMs,
            `Background model load timed out after ${Math.round(timeoutMs / 1000)}s on CPU fallback. Try again or turn BG removal off.`,
          );
          preloadedDevice = "cpu";
          setStatus({
            phase: "ready",
            progress: 100,
            label: "ready",
            device: "cpu",
            error: null,
          });
          return "cpu";
        } catch (cpuError) {
          const message = formatBgError(
            cpuError,
            "Background model failed to load on GPU and CPU.",
          );
          setStatus({
            phase: "error",
            progress: 0,
            label: "",
            device: null,
            error: message,
          });
          markAttemptFailedForRetry();
          throw new Error(message);
        }
      }

      const message = formatBgError(
        gpuOrPreferredError,
        "Background model failed to load.",
      );
      setStatus({
        phase: "error",
        progress: 0,
        label: "",
        device: null,
        error: message,
      });
      markAttemptFailedForRetry();
      throw new Error(message);
    }
  })();

  return preloadPromise;
}

export type RemoveBackgroundOptions = {
  onProgress?: ProgressCallback;
  timeoutMs?: number;
  /** Force a device (skips auto-detect). Tests use this. */
  device?: DeviceKind;
  /** When false, do not retry on CPU after GPU failure (default true). */
  cpuFallback?: boolean;
};

/**
 * Remove image background. Ensures model is ready (preload if needed),
 * times out, and retries on CPU if GPU inference fails.
 */
export async function removeBackground(
  image: Blob,
  onProgressOrOptions?: ProgressCallback | RemoveBackgroundOptions,
  maybeOptions?: RemoveBackgroundOptions,
): Promise<Blob> {
  // Support both removeBackground(blob, onProgress) and removeBackground(blob, options)
  let options: RemoveBackgroundOptions;
  if (typeof onProgressOrOptions === "function") {
    options = { ...maybeOptions, onProgress: onProgressOrOptions };
  } else {
    options = onProgressOrOptions ?? {};
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_REMOVE_TIMEOUT_MS;
  const cpuFallback = options.cpuFallback !== false;
  const onProgress = options.onProgress;

  let device: DeviceKind;
  try {
    device =
      options.device ??
      preloadedDevice ??
      (await preloadBackgroundRemoval(onProgress, {
        timeoutMs: options.timeoutMs ?? DEFAULT_PRELOAD_TIMEOUT_MS,
      }));
  } catch (err) {
    // preload already busted memo on failure; rethrow with UI-friendly text
    throw new Error(
      formatBgError(
        err,
        "Background removal is not ready. Try again or turn it off.",
      ),
    );
  }

  const imgly = await hooks.loadImgly();

  const run = (dev: DeviceKind) =>
    imgly.removeBackground(image, baseConfig(dev, onProgress));

  try {
    return await withTimeout(
      run(device),
      timeoutMs,
      `Background removal timed out after ${Math.round(timeoutMs / 1000)}s. Try a smaller photo or turn BG removal off.`,
    );
  } catch (firstError) {
    if (cpuFallback && device === "gpu") {
      try {
        const blob = await withTimeout(
          run("cpu"),
          timeoutMs,
          `Background removal timed out after ${Math.round(timeoutMs / 1000)}s on CPU. Try again or turn BG removal off.`,
        );
        preloadedDevice = "cpu";
        setStatus({
          phase: "ready",
          progress: 100,
          label: "ready",
          device: "cpu",
          error: null,
        });
        return blob;
      } catch (cpuError) {
        // Init may have memoized a rejection for this config — allow clean retry.
        markAttemptFailedForRetry();
        throw new Error(
          formatBgError(
            cpuError,
            "Background removal failed on GPU and CPU. Try again or turn it off.",
          ),
        );
      }
    }

    markAttemptFailedForRetry();
    throw new Error(
      formatBgError(
        firstError,
        "Background removal failed. Try again or turn it off.",
      ),
    );
  }
}

/** Test-only: inject library / WebGPU boundaries. */
export function __setBgRemovalTestHooks(
  partial: Partial<TestHooks> | null,
): void {
  if (partial == null) {
    hooks = {
      loadImgly: defaultLoadImgly,
      detectWebGPU: defaultDetectWebGPU,
    };
    return;
  }
  hooks = {
    loadImgly: partial.loadImgly ?? hooks.loadImgly,
    detectWebGPU: partial.detectWebGPU ?? hooks.detectWebGPU,
  };
}

/** Test-only: reset module state between tests. */
export function __resetBgRemovalState(): void {
  preloadPromise = null;
  preloadedDevice = null;
  memoBustGeneration = 0;
  status = {
    phase: "idle",
    progress: 0,
    label: "",
    device: null,
    error: null,
  };
  hooks = {
    loadImgly: defaultLoadImgly,
    detectWebGPU: defaultDetectWebGPU,
  };
}
