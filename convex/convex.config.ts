import { defineApp } from "convex/server";
import { v } from "convex/values";

// Environment variables set on the Convex deployment (never in code):
//   npx convex env set LENDLOOP_HMAC_SECRET <random 32+ byte hex>
//   npx convex env set N8N_WEBHOOK_URL https://<tunnel>/webhook/lendloop-request
// Both are optional so the app still works when n8n isn't set up;
// notifications are then skipped (and logged).
const app = defineApp({
  env: {
    // Shared secret used to sign and verify every Convex <-> n8n call.
    LENDLOOP_HMAC_SECRET: v.optional(v.string()),
    // n8n webhook that receives request events.
    N8N_WEBHOOK_URL: v.optional(v.string()),
  },
});

export default app;
