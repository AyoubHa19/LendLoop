"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { buttonClass, Loading } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS } from "@/convex/lib/constants";

const PREVIEW_ROWS = 6;

/**
 * Public landing page. Anyone can see what is on offer (name and category
 * only, straight from Convex), but not who owns it.
 */
export default function Home() {
  return (
    <div className="grid items-center gap-12 py-6 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-16 lg:py-16">
      <section className="flex max-w-xl flex-col gap-6">
        <h1 className="text-[40px] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[56px] sm:tracking-[-0.03em]">
          Borrow the drill. Lend the ladder
        </h1>
        <p className="max-w-[36rem] text-lg leading-7 text-fg-2">
          List the tools in your garage, borrow your neighbours&apos; for a few days, and get a reminder when
          it&apos;s time to give them back.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className={buttonClass("primary", "lg")}>Sign in to borrow</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link href="/tools" className={buttonClass("primary", "lg")}>
              Browse all tools
            </Link>
            <Link href="/listings" className={buttonClass("secondary", "lg")}>
              List a tool
            </Link>
          </Show>
        </div>
      </section>

      <BoardPreview />
    </div>
  );
}

/** The real board, read-only: what's listed right now in the neighbourhood. */
function BoardPreview() {
  const tools = useQuery(api.tools.listPublic);
  const shown = tools?.slice(0, PREVIEW_ROWS) ?? [];

  return (
    <section
      aria-labelledby="board-title"
      className="rounded-2xl border border-line bg-surface p-2 shadow-card"
    >
      <div className="flex items-baseline justify-between px-3 pb-2 pt-3">
        <h2 id="board-title" className="text-sm font-medium">
          On the board
        </h2>
        {tools && (
          <span className="font-mono text-xs tabular-nums text-fg-3">
            {tools.length} {tools.length === 1 ? "tool" : "tools"}
          </span>
        )}
      </div>

      {tools === undefined ? (
        <div className="px-3 py-6">
          <Loading />
        </div>
      ) : tools.length === 0 ? (
        <p className="px-3 py-8 text-sm text-fg-2">Nothing listed yet. The first tool you add shows up here.</p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((t) => (
            <li key={t._id} className="flex h-14 items-center gap-3 rounded-lg px-3">
              <CategoryIcon category={t.category} size="sm" />
              <span className="flex-1 truncate text-[15px]">{t.name}</span>
              <span className="text-[13px] text-fg-3">{CATEGORY_LABELS[t.category]}</span>
            </li>
          ))}
        </ul>
      )}

      {tools && tools.length > PREVIEW_ROWS && (
        <p className="px-3 pb-3 pt-1 text-[13px] text-fg-3">
          And {tools.length - PREVIEW_ROWS} more after you sign in
        </p>
      )}
    </section>
  );
}
