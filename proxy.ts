import { clerkMiddleware } from "@clerk/nextjs/server";

// Runs before every request so Clerk can read the session. Which pages need
// sign-in is decided in app/(signed-in)/layout.tsx, and who may read or
// change data is decided in each Convex function.
// (Next.js 16 calls this file proxy.ts; it used to be middleware.ts.)
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes, and for Clerk's own requests.
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
