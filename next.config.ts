import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      "onnxruntime-web/webgpu":
        "./node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs",
      "onnxruntime-web": "./node_modules/onnxruntime-web/dist/ort.min.mjs",
    },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      ],
    },
  ],
};

export default nextConfig;

if (
  process.env.NEXT_PHASE === "phase-development-server" ||
  process.argv.includes("dev")
) {
  import("@opennextjs/cloudflare").then((m) =>
    m.initOpenNextCloudflareForDev(),
  );
}
