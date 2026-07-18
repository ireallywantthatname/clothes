/**
 * Unit tests for the shipped BG-removal wrapper.
 * Mocks only the external @imgly / WebGPU boundary — control flow under test
 * is the real module.
 */
import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import {
  __resetBgRemovalState,
  __setBgRemovalTestHooks,
  __getMemoBustGeneration,
  formatBgError,
  getBgPreloadStatus,
  preloadBackgroundRemoval,
  removeBackground,
  resolveDevice,
  resolvePublicPath,
  withTimeout,
  BG_ASSET_PUBLIC_PATH,
  DEFAULT_REMOVE_TIMEOUT_MS,
} from "./removeBackground";

function pngBlob(label = "cutout"): Blob {
  return new Blob([label], { type: "image/png" });
}

beforeEach(() => {
  __resetBgRemovalState();
});

afterEach(() => {
  __resetBgRemovalState();
});

describe("formatBgError", () => {
  test("returns non-empty message from Error", () => {
    const msg = formatBgError(new Error("GPU died"), "fallback");
    expect(msg.length).toBeGreaterThan(0);
    expect(msg).toBe("GPU died");
  });

  test("returns non-empty fallback for empty/unknown errors", () => {
    expect(formatBgError(null, "try again")).toBe("try again");
    expect(formatBgError(new Error("   "), "try again")).toBe("try again");
    expect(formatBgError("", "try again")).toBe("try again");
  });
});

describe("withTimeout", () => {
  test("resolves when promise finishes in time", async () => {
    const value = await withTimeout(Promise.resolve(42), 1000, "timed out");
    expect(value).toBe(42);
  });

  test("rejects with timeout message when promise never settles", async () => {
    const never = new Promise<void>(() => {});
    const start = Date.now();
    await expect(
      withTimeout(never, 50, "Background removal timed out after 0s"),
    ).rejects.toThrow(/timed out/i);
    expect(Date.now() - start).toBeLessThan(500);
  });
});

describe("resolvePublicPath / assets", () => {
  test("public path points at self-hosted bg-removal directory", () => {
    expect(BG_ASSET_PUBLIC_PATH).toBe("/bg-removal/");
    expect(resolvePublicPath()).toContain("bg-removal");
  });
});

describe("resolveDevice", () => {
  test("selects cpu when WebGPU is unavailable", async () => {
    __setBgRemovalTestHooks({
      detectWebGPU: async () => false,
    });
    expect(await resolveDevice()).toBe("cpu");
  });

  test("selects gpu when WebGPU is available", async () => {
    __setBgRemovalTestHooks({
      detectWebGPU: async () => true,
    });
    expect(await resolveDevice()).toBe("gpu");
  });
});

describe("preloadBackgroundRemoval", () => {
  test("marks ready on successful CPU preload", async () => {
    const preload = mock(async () => {});
    __setBgRemovalTestHooks({
      detectWebGPU: async () => false,
      loadImgly: async () => ({
        preload,
        removeBackground: async () => pngBlob(),
      }),
    });

    const device = await preloadBackgroundRemoval(undefined, {
      timeoutMs: 1000,
    });
    expect(device).toBe("cpu");
    expect(preload).toHaveBeenCalled();
    const status = getBgPreloadStatus();
    expect(status.phase).toBe("ready");
    expect(status.device).toBe("cpu");
    expect(status.error).toBeNull();
  });

  test("falls back to CPU when GPU preload fails", async () => {
    const devices: string[] = [];
    __setBgRemovalTestHooks({
      detectWebGPU: async () => true,
      loadImgly: async () => ({
        preload: async (config) => {
          devices.push(config.device);
          if (config.device === "gpu") {
            throw new Error("WebGPU session failed");
          }
        },
        removeBackground: async () => pngBlob(),
      }),
    });

    const device = await preloadBackgroundRemoval(undefined, {
      timeoutMs: 1000,
    });
    expect(device).toBe("cpu");
    expect(devices).toEqual(["gpu", "cpu"]);
    expect(getBgPreloadStatus().phase).toBe("ready");
    expect(getBgPreloadStatus().device).toBe("cpu");
  });

  test("rejects with non-empty message and error status on total failure", async () => {
    __setBgRemovalTestHooks({
      detectWebGPU: async () => false,
      loadImgly: async () => ({
        preload: async () => {
          throw new Error("network offline");
        },
        removeBackground: async () => pngBlob(),
      }),
    });

    await expect(
      preloadBackgroundRemoval(undefined, { timeoutMs: 500 }),
    ).rejects.toThrow(/network offline|failed/i);

    const status = getBgPreloadStatus();
    expect(status.phase).toBe("error");
    expect(status.error && status.error.length).toBeGreaterThan(0);
  });

  test("times out hung preload", async () => {
    __setBgRemovalTestHooks({
      detectWebGPU: async () => false,
      loadImgly: async () => ({
        preload: () => new Promise(() => {}),
        removeBackground: async () => pngBlob(),
      }),
    });

    await expect(
      preloadBackgroundRemoval(undefined, { timeoutMs: 40 }),
    ).rejects.toThrow(/timed out/i);
    expect(getBgPreloadStatus().phase).toBe("error");
  });

  test("retries after failed preload despite imgly-style memoized rejections", async () => {
    // Mirrors @imgly/background-removal:
    //   init = memoize(initInference, (config) => JSON.stringify(config))
    // Rejected promises stay in the cache for an identical config key.
    const memo = new Map<string, Promise<void>>();
    let realInitAttempts = 0;

    const memoizedPreload = (config: {
      device: string;
      __memoBust?: number;
      [k: string]: unknown;
    }) => {
      // Same key strategy as imgly (functions dropped by JSON.stringify)
      const key = JSON.stringify(config);
      if (memo.has(key)) {
        return memo.get(key)!;
      }
      const result = (async () => {
        realInitAttempts += 1;
        // First real init fails (transient); later attempts succeed
        if (realInitAttempts === 1) {
          throw new Error("transient CDN blip");
        }
      })();
      memo.set(key, result);
      return result;
    };

    __setBgRemovalTestHooks({
      detectWebGPU: async () => false,
      loadImgly: async () => ({
        preload: memoizedPreload,
        removeBackground: async () => pngBlob("ok"),
      }),
    });

    const genBefore = __getMemoBustGeneration();

    await expect(
      preloadBackgroundRemoval(undefined, { timeoutMs: 1000 }),
    ).rejects.toThrow(/transient CDN blip|failed/i);

    // Failure must bump generation so the next config key differs
    expect(__getMemoBustGeneration()).toBeGreaterThan(genBefore);
    expect(getBgPreloadStatus().phase).toBe("error");

    // Without __memoBust bump, memo would re-serve the same rejection forever.
    // Second call must open a new init (realInitAttempts === 2) and succeed.
    const device = await preloadBackgroundRemoval(undefined, {
      timeoutMs: 1000,
    });
    expect(device).toBe("cpu");
    expect(realInitAttempts).toBe(2);
    expect(getBgPreloadStatus().phase).toBe("ready");

    // removeBackground should also work after the recovered preload
    const out = await removeBackground(pngBlob("in"), { timeoutMs: 1000 });
    expect(await out.text()).toBe("ok");
  });
});

describe("removeBackground", () => {
  test("uses CPU path when WebGPU unavailable and returns PNG blob", async () => {
    const calledDevices: string[] = [];
    __setBgRemovalTestHooks({
      detectWebGPU: async () => false,
      loadImgly: async () => ({
        preload: async () => {},
        removeBackground: async (_image, config) => {
          calledDevices.push(config.device);
          return pngBlob("cpu-out");
        },
      }),
    });

    const result = await removeBackground(pngBlob("in"), {
      timeoutMs: 1000,
    });
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/png");
    expect(await result.text()).toBe("cpu-out");
    expect(calledDevices).toContain("cpu");
    expect(calledDevices).not.toContain("gpu");
  });

  test("falls back to CPU when GPU removeBackground rejects", async () => {
    const calledDevices: string[] = [];
    __setBgRemovalTestHooks({
      detectWebGPU: async () => true,
      loadImgly: async () => ({
        preload: async () => {},
        removeBackground: async (_image, config) => {
          calledDevices.push(config.device);
          if (config.device === "gpu") {
            throw new Error("GPU inference crashed");
          }
          return pngBlob("cpu-fallback");
        },
      }),
    });

    const result = await removeBackground(pngBlob("in"), {
      timeoutMs: 1000,
    });
    expect(await result.text()).toBe("cpu-fallback");
    expect(calledDevices).toEqual(["gpu", "cpu"]);
  });

  test("rejects within timeout when underlying remove never resolves", async () => {
    __setBgRemovalTestHooks({
      detectWebGPU: async () => false,
      loadImgly: async () => ({
        preload: async () => {},
        removeBackground: () => new Promise(() => {}),
      }),
    });

    const start = Date.now();
    await expect(
      removeBackground(pngBlob("in"), { timeoutMs: 60, device: "cpu" }),
    ).rejects.toThrow(/timed out/i);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  test("surfaces non-empty error when both GPU and CPU fail", async () => {
    __setBgRemovalTestHooks({
      detectWebGPU: async () => true,
      loadImgly: async () => ({
        preload: async () => {},
        removeBackground: async () => {
          throw new Error("ort session dead");
        },
      }),
    });

    try {
      await removeBackground(pngBlob("in"), { timeoutMs: 500 });
      throw new Error("expected removeBackground to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const message = (err as Error).message;
      expect(message.length).toBeGreaterThan(0);
      expect(message).toMatch(/ort session dead|failed/i);
    }
  });

  test("default timeout constant is finite and positive", () => {
    expect(DEFAULT_REMOVE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(Number.isFinite(DEFAULT_REMOVE_TIMEOUT_MS)).toBe(true);
  });
});
