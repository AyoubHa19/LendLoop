"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { ThemeToggle } from "./ThemeToggle";
import { buttonClass } from "./ui";

// Sections of the landing page, for visitors who aren't signed in yet.
const LANDING_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#reminders", label: "Reminders" },
  { href: "/#privacy", label: "Privacy" },
];

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
  const [open, setOpen] = useState(false);

  // Create (or refresh) the caller's user row once Convex has their token.
  useEffect(() => {
    if (isAuthenticated) void ensureUser();
  }, [isAuthenticated, ensureUser]);

  const links = me?.isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;
  const linkClass = (href: string) =>
    `inline-flex h-8 items-center rounded-lg px-3 text-sm transition-colors duration-150 ease-out ${
      pathname === href ? "bg-raised text-fg" : "text-fg-2 hover:text-fg"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-[18px] font-medium tracking-[-0.02em]">
          <Image src="/loop-mark.png" alt="" width={24} height={24} className="ink size-6" priority />
          LendLoop
        </Link>

        <Show when="signed-in">
          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
        </Show>
        <Show when="signed-out">
          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Sections">
            {LANDING_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </a>
            ))}
          </nav>
        </Show>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className={buttonClass("primary")}>Sign in</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex size-8 items-center justify-center rounded-lg text-fg-2 hover:bg-raised md:hidden"
            >
              {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>
          </Show>
        </div>
      </div>

      <Show when="signed-in">
        {open && (
          <nav id="mobile-nav" aria-label="Main" className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </Show>
    </header>
  );
}
