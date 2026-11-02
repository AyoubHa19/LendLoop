"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold">LendLoop</span>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
              Sign in
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>

      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Borrow the drill. Lend the ladder.
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          A tool-lending board for your neighbourhood.
        </p>
      </section>

      {/* Stage 1 check: shows what Convex itself sees about the caller. */}
      <ConnectionStatus />
    </div>
  );
}

function ConnectionStatus() {
  const me = useQuery(api.viewer.me);

  if (me === undefined) return <p className="text-sm text-zinc-500">Connecting to Convex…</p>;
  return (
    <p className="text-sm text-zinc-500">
      Convex connected · {me ? `signed in as ${me.name ?? "a user"}` : "not signed in"}
    </p>
  );
}
