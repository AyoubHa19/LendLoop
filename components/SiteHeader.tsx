"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "./ui";

const LINKS = [
  { href: "/tools", label: "All tools" },
  { href: "/listings", label: "My listings" },
  { href: "/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const me = useQuery(api.users.me);
  const ensureUser = useMutation(api.users.ensure);
  const { isAuthenticated } = useConvexAuth();

  // Create (or refresh) the caller's user row once Convex has their token.
  useEffect(() => {
    if (isAuthenticated) void ensureUser();
  }, [isAuthenticated, ensureUser]);

  const links = me?.isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="text-lg font-semibold">
          LendLoop
        </Link>
        <Show when="signed-in">
          <nav className="flex flex-1 flex-wrap gap-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  pathname === l.href
                    ? "font-medium"
                    : "text-zinc-600 hover:text-foreground dark:text-zinc-400"
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <UserButton />
        </Show>
        <Show when="signed-out">
          <div className="flex-1" />
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        </Show>
      </div>
    </header>
  );
}
