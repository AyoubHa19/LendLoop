"use client";

import { RedirectToSignIn, Show } from "@clerk/nextjs";
import type { ReactNode } from "react";

/**
 * Every page in this folder is for signed-in users; signed-out visitors are
 * sent to sign in. (The "(signed-in)" folder name doesn't appear in URLs.)
 *
 * The pages always render, so Next.js can prerender them and check instant
 * navigation. That is safe because they hold no data of their own: they
 * load everything from Convex, and every Convex function checks the caller,
 * so a signed-out visitor only ever sees empty shells before the redirect.
 */
export default function SignedInLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 sm:px-8">
      {children}
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </div>
  );
}
