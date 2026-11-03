"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Search, ShieldCheck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  Button,
  Card,
  Empty,
  ErrorText,
  inputClass,
  labelClass,
  Loading,
  PageHeader,
  Status,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { useSignedInQuery } from "@/lib/useSignedInQuery";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  type Category,
} from "@/convex/lib/constants";
import { todayUtc } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";

type Tool = FunctionReturnType<typeof api.tools.list>[number];

export function ToolsBoard() {
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [search, setSearch] = useState("");
  const tools = useSignedInQuery(api.tools.list, { category });
  const me = useSignedInQuery(api.users.me, {});

  // Name search runs on the list Convex already returned (at most 200 tools,
  // all of which the caller may see), so it needs no extra backend call.
  const term = search.trim().toLowerCase();
  const visible = tools?.filter((t) => t.name.toLowerCase().includes(term));

  return (
    <>
      <PageHeader title="All tools" description="Everything your neighbours are lending right now" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative md:w-72">
          <span className="sr-only">Search tools by name</span>
          <Search
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className={`${inputClass} pl-9`}
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <FilterChip active={category === undefined} onClick={() => setCategory(undefined)}>
            All
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
              {CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </div>
      </div>

      {visible === undefined ? (
        <Loading />
      ) : visible.length === 0 ? (
        <Empty title={term ? `No tools match “${search.trim()}”` : "No tools in this category yet"}>
          {term ? "Try a shorter name, or another category." : "Lend one of yours from My listings."}
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((tool) => (
            <ToolCard key={tool._id} tool={tool} isAdmin={me?.isAdmin ?? false} />
          ))}
        </div>
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center rounded-lg px-3 text-[13px] transition-colors duration-150 ease-out ${
        active
          ? "bg-primary font-medium text-on-primary"
          : "border border-line text-fg-2 hover:bg-raised hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function ToolCard({ tool, isAdmin }: { tool: Tool; isAdmin: boolean }) {
  const [requesting, setRequesting] = useState(false);
  const removeTool = useMutation(api.tools.remove);
  const [error, setError] = useState("");

  async function onRemove() {
    if (!confirm(`Remove "${tool.name}" from the board?`)) return;
    setError("");
    try {
      await removeTool({ toolId: tool._id });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <CategoryIcon category={tool.category} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-[15px] font-medium">{tool.name}</h2>
          <p className="text-[13px] text-fg-3">
            {CATEGORY_LABELS[tool.category]}, {CONDITION_LABELS[tool.condition].toLowerCase()} condition
          </p>
        </div>
      </div>

      <p className="line-clamp-3 text-sm leading-5 text-fg-2">{tool.description}</p>

      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-fg-2">
            <span className="truncate">{tool.isMine ? "Your tool" : tool.ownerName}</span>
            {tool.ownerTrusted && (
              <span className="inline-flex items-center gap-1 text-fg-2" title="Trusted Lender">
                <ShieldCheck size={14} strokeWidth={1.5} aria-hidden />
                <span className="sr-only sm:not-sr-only">Trusted</span>
              </span>
            )}
          </span>
          {tool.available ? <Status tone="positive">Available</Status> : <Status tone="neutral">On loan</Status>}
        </div>

        {!tool.isMine &&
          (requesting ? (
            <RequestForm toolId={tool._id} onDone={() => setRequesting(false)} />
          ) : (
            <Button variant="secondary" onClick={() => setRequesting(true)}>
              Request to borrow
            </Button>
          ))}
        {isAdmin && (
          <Button variant="danger" onClick={onRemove}>
            Remove listing
          </Button>
        )}
        <ErrorText>{error}</ErrorText>
      </div>
    </Card>
  );
}

function RequestForm({ toolId, onDone }: { toolId: Id<"tools">; onDone: () => void }) {
  const createRequest = useMutation(api.requests.create);
  const today = todayUtc();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await createRequest({ toolId, startDate, endDate });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="text-sm text-positive">Request sent. You can follow it in My requests.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className={labelClass}>
          From
          <input type="date" required min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          Until
          <input type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </label>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Sending" : "Send request"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
