"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState, type FormEvent } from "react";
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
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  type Category,
  type Condition,
} from "@/convex/lib/constants";
import { errorMessage } from "@/lib/errors";

type Listing = FunctionReturnType<typeof api.tools.myListings>[number];
type ToolFields = { name: string; category: Category; condition: Condition; description: string };

const EMPTY: ToolFields = { name: "", category: "power-tools", condition: "good", description: "" };

export function MyListings() {
  const listings = useQuery(api.tools.myListings);
  const createTool = useMutation(api.tools.create);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="My listings" description="Tools you lend to your neighbours." />
        {!adding && <Button onClick={() => setAdding(true)}>List a tool</Button>}
      </div>

      {adding && (
        <Card>
          <ToolForm
            initial={EMPTY}
            submitLabel="List tool"
            onSubmit={async (fields) => {
              await createTool(fields);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </Card>
      )}

      {listings === undefined ? (
        <Loading />
      ) : listings.length === 0 ? (
        <Empty>You haven&apos;t listed any tools yet.</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map((tool) => (
            <ListingRow key={tool._id} tool={tool} />
          ))}
        </div>
      )}
    </>
  );
}

function ListingRow({ tool }: { tool: Listing }) {
  const updateTool = useMutation(api.tools.update);
  const removeTool = useMutation(api.tools.remove);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    if (!confirm(`Delete "${tool.name}"? Pending requests for it will be declined.`)) return;
    setError("");
    try {
      await removeTool({ toolId: tool._id });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (editing) {
    return (
      <Card>
        <ToolForm
          initial={tool}
          submitLabel="Save changes"
          onSubmit={async (fields) => {
            await updateTool({ toolId: tool._id, ...fields });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-medium">{tool.name}</h2>
          {tool.available ? <Badge tone="green">Available</Badge> : <Badge tone="blue">On loan</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{CATEGORY_LABELS[tool.category]}</Badge>
          <Badge>Condition: {CONDITION_LABELS[tool.condition]}</Badge>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{tool.description}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
        <ErrorText>{error}</ErrorText>
      </div>
    </Card>
  );
}

function ToolForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ToolFields;
  submitLabel: string;
  onSubmit: (fields: ToolFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<ToolFields>({
    name: initial.name,
    category: initial.category,
    condition: initial.condition,
    description: initial.description,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit(fields);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          required
          maxLength={80}
          value={fields.name}
          onChange={(e) => setFields({ ...fields, name: e.target.value })}
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            value={fields.category}
            onChange={(e) => setFields({ ...fields, category: e.target.value as Category })}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Condition
          <select
            value={fields.condition}
            onChange={(e) => setFields({ ...fields, condition: e.target.value as Condition })}
            className={inputClass}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          required
          maxLength={1000}
          rows={3}
          value={fields.description}
          onChange={(e) => setFields({ ...fields, description: e.target.value })}
          className={inputClass}
        />
      </label>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
