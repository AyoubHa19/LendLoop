import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only the landing page is public. Every other page sends signed-out
// visitors to sign in first.
//
// This is a convenience for the UI, not the security boundary: every
// Convex function checks the caller itself, so data stays protected even if
// someone skips these pages and calls Convex directly.
// (Next.js 16 calls this file proxy.ts; it used to be middleware.ts.)
const isPublicRoute = createRouteMatcher(["/"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes, and for Clerk's own requests.
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
