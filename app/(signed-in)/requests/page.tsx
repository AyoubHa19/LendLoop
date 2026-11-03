"use client";

import { useMutation } from "convex/react";
import { ActionButton, LoanList } from "@/components/LoanList";
import { PageHeader } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { useSignedInQuery } from "@/lib/useSignedInQuery";

/** Requests the signed-in user made as a borrower. */
export default function MyRequestsPage() {
  const rows = useSignedInQuery(api.requests.mine, {});
  const cancel = useMutation(api.requests.cancel);

  return (
    <>
      <PageHeader title="My requests" description="Tools you asked to borrow" />
      <LoanList
        rows={rows}
        who={(r) => `Lent by ${r.lenderName}`}
        empty={{ title: "No requests yet", hint: "Pick a tool in All tools and choose your dates." }}
        actions={(r) =>
          r.status === "pending" && (
            <ActionButton label="Cancel request" variant="ghost" run={() => cancel({ requestId: r._id })} />
          )
        }
      />
    </>
  );
}
