"use client";

import { useMutation } from "convex/react";
import { ActionButton, LoanList } from "@/components/LoanList";
import { PageHeader } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { useSignedInQuery } from "@/lib/useSignedInQuery";

/** Requests neighbours made for the signed-in user's tools. */
export default function IncomingPage() {
  const rows = useSignedInQuery(api.requests.incoming, {});
  const approve = useMutation(api.requests.approve);
  const decline = useMutation(api.requests.decline);
  const markReturned = useMutation(api.requests.markReturned);

  return (
    <>
      <PageHeader title="Incoming" description="Neighbours who want to borrow your tools" />
      <LoanList
        rows={rows}
        who={(r) => `Requested by ${r.borrowerName}`}
        empty={{ title: "No requests for your tools yet", hint: "They appear here as soon as someone asks." }}
        actions={(r) => (
          <>
            {r.status === "pending" && (
              <>
                <ActionButton label="Decline" variant="ghost" run={() => decline({ requestId: r._id })} />
                <ActionButton label="Approve" variant="primary" run={() => approve({ requestId: r._id })} />
              </>
            )}
            {r.status === "approved" && (
              <ActionButton label="Mark returned" run={() => markReturned({ requestId: r._id })} />
            )}
          </>
        )}
      />
    </>
  );
}
