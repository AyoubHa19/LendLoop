"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Badge, Button, buttonClass, Empty, Loading } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS } from "@/convex/lib/constants";

/** Public landing page: anyone can see what's on offer, but not who owns it. */
export default function Home() {
  const tools = useQuery(api.tools.listPublic);

  return (
    <>
      <section className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Borrow the drill. Lend the ladder.</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          A tool-lending board for your neighbourhood. Sign in to list your tools or borrow one.
        </p>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button>Sign in to borrow</Button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <Link href="/tools" className={buttonClass()}>
            Browse all tools
          </Link>
        </Show>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Available on the board</h2>
        {tools === undefined ? (
          <Loading />
        ) : tools.length === 0 ? (
          <Empty>No tools listed yet.</Empty>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {tools.map((t) => (
              <li key={t._id} className="flex items-center justify-between px-4 py-3">
                <span>{t.name}</span>
                <Badge>{CATEGORY_LABELS[t.category]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
