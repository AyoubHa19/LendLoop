"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorText,
  inputClass,
  Loading,
  PageHeader,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  type Category,
} from "@/convex/lib/constants";
import { todayUtc } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";

export function ToolsBoard() {
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const tools = useQuery(api.tools.list, { category });
  const me = useQuery(api.users.me);

  return (
    <>
      <PageHeader title="All tools" description="Everything your neighbours are lending." />

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

      {tools === undefined ? (
        <Loading />
      ) : tools.length === 0 ? (
        <Empty>No tools in this category yet.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
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
      className={`rounded-full border px-3 py-1 text-sm ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

type Tool = FunctionReturnType<typeof api.tools.list>[number];

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
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-medium">{tool.name}</h2>
          {tool.available ? <Badge tone="green">Available</Badge> : <Badge tone="blue">On loan</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{CATEGORY_LABELS[tool.category]}</Badge>
          <Badge>Condition: {CONDITION_LABELS[tool.condition]}</Badge>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{tool.description}</p>
        <p className="flex items-center gap-2 text-sm">
          Lent by {tool.isMine ? "you" : tool.ownerName}
          {tool.ownerTrusted && <Badge tone="blue">Trusted Lender</Badge>}
        </p>

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
            Remove listing (admin)
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
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-400">
        Request sent. Track it under My requests.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm">
          From
          <input type="date" required min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          To
          <input type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </label>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send request"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
