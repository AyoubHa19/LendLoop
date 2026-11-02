"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
  // `npx convex dev` writes this to .env.local.
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local. Run `npx convex dev`.");
}

// One client for the whole app (a single WebSocket to Convex).
const convex = new ConvexReactClient(url);

/**
 * Connects the app to Convex and attaches the Clerk session token to every
 * request, so Convex functions can identify the caller. Must sit inside
 * <ClerkProvider>.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
