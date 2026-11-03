"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { BellRing, CalendarRange, EyeOff, Hammer, Lock, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { DateSlip } from "@/components/DateSlip";
import { Reveal } from "@/components/landing/Reveal";
import { ScrollingLoop } from "@/components/landing/ScrollingLoop";
import { buttonClass, Loading, Status } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS } from "@/convex/lib/constants";

/**
 * Public landing page. Everything on it is either copy or data anyone may
 * see: the board shows tool names and categories only, straight from Convex.
 */
export default function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <HowItWorks />
      <OnTheBoard />
      <Reminders />
      <Privacy />
      <FinalCall />
      <Footer />
    </div>
  );
}

/** A centred column with hairlines down both sides, so sections read as one sheet. */
function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-6xl border-x border-line px-6 sm:px-10 ${className}`}>{children}</div>
  );
}

function SectionTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <h2 className="font-display text-[32px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
        {title}
      </h2>
      {children && <p className="text-[17px] leading-7 text-fg-2">{children}</p>}
    </div>
  );
}

function PrimaryAction() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className={buttonClass("primary", "lg")}>Sign in to borrow</button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link href="/tools" className={buttonClass("primary", "lg")}>
          Browse all tools
        </Link>
      </Show>
    </>
  );
}

function Hero() {
  return (
    <section className="border-b border-line">
      <Frame className="relative grid min-h-[calc(100svh-3.5rem)] items-center gap-12 overflow-hidden py-16 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative z-10 flex flex-col items-start gap-8">
          <h1 className="font-display text-[40px] font-medium leading-[0.98] tracking-[-0.035em] sm:text-[60px] xl:text-[72px]">
            Borrow the drill.
            <br />
            Lend the ladder.
          </h1>
          <p className="max-w-[34rem] text-lg leading-7 text-fg-2">
            LendLoop is a lending board for one neighbourhood. List the tools in your garage, borrow your
            neighbours&apos; for a few days, and get a reminder when it&apos;s time to give them back.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryAction />
            <a href="#how-it-works" className={buttonClass("ghost", "lg")}>
              How it works
            </a>
          </div>
        </div>

        {/* A faint stipple field behind the drawing, echoing its ink dots. */}
        <div className="relative flex items-center justify-center lg:justify-end">
          <div
            aria-hidden
            className="absolute inset-0 [background-image:radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]"
          />
          <ScrollingLoop size={420} className="relative w-[260px] sm:w-[340px] lg:w-[420px]" />
        </div>
      </Frame>
    </section>
  );
}

const STEPS = [
  {
    icon: Hammer,
    title: "List what you own",
    text: "Add a tool with its category, its condition and a line about it. Only you can edit or remove it.",
  },
  {
    icon: CalendarRange,
    title: "Ask for the days you need",
    text: "Pick a tool and a date range of up to 30 days. Dates that clash with an approved loan are refused.",
  },
  {
    icon: BellRing,
    title: "Hand it back on time",
    text: "The owner approves, you collect it, and LendLoop emails a reminder if the end date passes.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-14 border-b border-line">
      <Frame className="flex flex-col gap-12 py-24">
        <Reveal>
          <SectionTitle title="Three steps, from shelf to shelf" />
        </Reveal>
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="bg-bg">
              <Reveal delay={i * 60} className="flex h-full flex-col gap-6 p-8">
                <div className="flex items-center justify-between">
                  <step.icon size={20} strokeWidth={1.5} className="text-fg-2" aria-hidden />
                  <span className="font-mono text-xs tabular-nums text-fg-3">{i + 1}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-[22px] font-medium tracking-[-0.01em]">{step.title}</h3>
                  <p className="text-[15px] leading-6 text-fg-2">{step.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </Frame>
    </section>
  );
}

const PREVIEW_ROWS = 6;

function OnTheBoard() {
  const tools = useQuery(api.tools.listPublic);
  const shown = tools?.slice(0, PREVIEW_ROWS) ?? [];

  return (
    <section className="border-b border-line">
      <Frame className="grid gap-12 py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <Reveal>
          <SectionTitle title="On the board right now">
            This list is live. Anyone can see what is on offer; who owns it, and the details, are only
            shown to neighbours who have signed in.
          </SectionTitle>
        </Reveal>
        <Reveal delay={80}>
          <div className="rounded-2xl border border-line bg-surface p-2 shadow-card">
            <div className="flex items-baseline justify-between px-4 pb-2 pt-3">
              <span className="text-sm font-medium">Tools</span>
              {tools && (
                <span className="font-mono text-xs tabular-nums text-fg-3">
                  {tools.length} listed
                </span>
              )}
            </div>
            {tools === undefined ? (
              <div className="px-4 py-6">
                <Loading />
              </div>
            ) : tools.length === 0 ? (
              <p className="px-4 py-8 text-sm text-fg-2">Nothing listed yet. The first tool you add shows up here.</p>
            ) : (
              <ul className="flex flex-col">
                {shown.map((t) => (
                  <li key={t._id} className="flex h-14 items-center gap-3 rounded-lg px-4">
                    <CategoryIcon category={t.category} size="sm" />
                    <span className="flex-1 truncate text-[15px]">{t.name}</span>
                    <span className="text-[13px] text-fg-3">{CATEGORY_LABELS[t.category]}</span>
                  </li>
                ))}
              </ul>
            )}
            {tools && tools.length > PREVIEW_ROWS && (
              <p className="px-4 pb-3 pt-1 text-[13px] text-fg-3">
                And {tools.length - PREVIEW_ROWS} more after you sign in
              </p>
            )}
          </div>
        </Reveal>
      </Frame>
    </section>
  );
}

const AUTOMATIONS = [
  "An email to the owner when someone asks for their tool",
  "An email to the borrower when the owner approves, declines or marks it returned",
  "A reminder every morning at 09:00 for each loan past its end date, never twice on the same day",
  "A note on the loan itself, so both sides can see what was sent and when",
];

function Reminders() {
  return (
    <section id="reminders" className="scroll-mt-14 border-b border-line">
      <Frame className="grid gap-12 py-24 lg:grid-cols-2 lg:items-center">
        <Reveal className="flex flex-col gap-8">
          <SectionTitle title="Nobody has to chase anyone">
            The awkward messages are sent for you. Each one carries only what it needs: a name, the tool
            and the dates.
          </SectionTitle>
          <ul className="flex flex-col gap-3">
            {AUTOMATIONS.map((line) => (
              <li key={line} className="flex gap-3 text-[15px] leading-6 text-fg-2">
                <span className="mt-2.5 size-1 shrink-0 rounded-full bg-fg-3" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* What a loan looks like after a reminder went out (example data). */}
        <Reveal delay={80}>
          <figure className="flex flex-col gap-3">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <CategoryIcon category="garden" />
                <div className="flex flex-col">
                  <span className="text-[15px] font-medium">Hedge trimmer</span>
                  <span className="text-[13px] text-fg-3">Lent by Samira</span>
                </div>
                <span className="ml-auto">
                  <Status tone="negative">Overdue</Status>
                </span>
              </div>
              <div className="mt-6 flex flex-col items-start gap-3 border-t border-line pt-5">
                <DateSlip start="2026-10-24" end="2026-10-27" />
                <ul className="flex flex-col gap-1 text-[13px] text-fg-3">
                  <li>Overdue reminder emailed, 2 days ago</li>
                  <li>Borrower notified by email, 10 days ago</li>
                  <li>Lender notified by email, 11 days ago</li>
                </ul>
              </div>
            </div>
            <figcaption className="text-xs text-fg-3">An example loan, as both neighbours see it</figcaption>
          </figure>
        </Reveal>
      </Frame>
    </section>
  );
}

const PRIVACY = [
  {
    icon: EyeOff,
    title: "Your email stays yours",
    text: "Neighbours see your name, never your address or email. It is used only to send you reminders.",
  },
  {
    icon: Lock,
    title: "Checked on the server",
    text: "Who may edit, approve or remove something is decided by the backend on every request, not by the page.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Lenders",
    text: "Admins can mark neighbours who lend reliably, and the badge appears next to their tools.",
  },
];

function Privacy() {
  return (
    <section id="privacy" className="scroll-mt-14 border-b border-line">
      <Frame className="flex flex-col gap-12 py-24">
        <Reveal>
          <SectionTitle title="Private by default" />
        </Reveal>
        <div className="grid gap-10 md:grid-cols-3">
          {PRIVACY.map((item, i) => (
            <Reveal key={item.title} delay={i * 60} className="flex flex-col gap-3">
              <item.icon size={20} strokeWidth={1.5} className="text-fg-2" aria-hidden />
              <h3 className="font-display text-[20px] font-medium tracking-[-0.01em]">{item.title}</h3>
              <p className="text-[15px] leading-6 text-fg-2">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </Frame>
    </section>
  );
}

function FinalCall() {
  return (
    <section className="border-b border-line">
      <Frame className="flex flex-col items-center gap-8 py-28 text-center">
        <Reveal className="flex flex-col items-center gap-8">
          <Image src="/loop-mark.png" alt="" width={64} height={64} className="ink size-16" />
          <h2 className="max-w-xl font-display text-[36px] font-medium leading-[1.05] tracking-[-0.025em] sm:text-[52px]">
            Lend something this weekend
          </h2>
          <PrimaryAction />
        </Reveal>
      </Frame>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <Frame className="flex flex-col gap-2 py-10 text-[13px] text-fg-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2 text-fg-2">
          <Image src="/loop-mark.png" alt="" width={16} height={16} className="ink size-4" />
          LendLoop
        </span>
        <span>Borrow and lend tools with your neighbours</span>
      </Frame>
    </footer>
  );
}
