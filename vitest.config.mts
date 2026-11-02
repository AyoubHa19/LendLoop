import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Convex functions run in an edge-like runtime; test them in the same one.
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
