import type { AuthConfig } from "convex/server";

// Tells Convex which sign-ins to trust: JWTs issued by our Clerk app for the
// "convex" audience. Convex verifies the token signature itself, so a
// function never has to trust what the browser claims about the user.
//
// CLERK_FRONTEND_API_URL is set on the Convex deployment (dashboard or
// `npx convex env set`), not in .env.local.
export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
