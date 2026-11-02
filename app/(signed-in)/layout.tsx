"use client";

import { RedirectToSignIn, Show } from "@clerk/nextjs";
import type { ReactNode } from "react";

/**
 * Every page in this folder is for signed-in users; signed-out visitors are
 * sent to sign in. (The "(signed-in)" folder name doesn't appear in URLs.)
 *
 * This only decides what to show. It is not the security boundary: these
 * pages load all their data from Convex, and every Convex function checks
 * the caller itself, so nothing leaks even if someone skips this layout.
 */
export default function SignedInLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}
