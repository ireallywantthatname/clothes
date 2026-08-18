import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    PASSCODE: v.optional(v.string()),
  },
});

export default app;
