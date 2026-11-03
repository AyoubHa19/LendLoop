"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState, type FormEvent } from "react";
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
  const listings = useSignedInQuery(api.tools.myListings, {});
  const createTool = useMutation(api.tools.create);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="My listings"
        description="Tools you lend to your neighbours"
        action={!adding && <Button onClick={() => setAdding(true)}>List a tool</Button>}
      />

      {adding && (
        <Card className="max-w-2xl">
          <h2 className="mb-4 text-[15px] font-medium">New listing</h2>
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
        <Empty title="You haven't listed any tools yet">
          Add the drill, ladder or hedge trimmer you&apos;d happily lend for a few days.
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
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
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <CategoryIcon category={tool.category} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-[15px] font-medium">{tool.name}</h2>
          <p className="text-[13px] text-fg-3">
            {CATEGORY_LABELS[tool.category]}, {CONDITION_LABELS[tool.condition].toLowerCase()} condition
          </p>
        </div>
        {tool.available ? <Status tone="positive">Available</Status> : <Status tone="neutral">On loan</Status>}
      </div>
      <p className="line-clamp-3 text-sm leading-5 text-fg-2">{tool.description}</p>
      <div className="mt-auto flex gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button variant="ghost" onClick={onDelete} className="text-negative hover:text-negative">
          Delete
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
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
      <label className={labelClass}>
        Name
        <input
          required
          maxLength={80}
          value={fields.name}
          onChange={(e) => setFields({ ...fields, name: e.target.value })}
          className={inputClass}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
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
        <label className={labelClass}>
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
      <label className={labelClass}>
        Description
        <textarea
          required
          maxLength={1000}
          rows={3}
          value={fields.description}
          onChange={(e) => setFields({ ...fields, description: e.target.value })}
          className={`${inputClass} h-auto py-2`}
        />
      </label>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
