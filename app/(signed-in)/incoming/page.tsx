"use client";

import { useMutation, useQuery } from "convex/react";
import { ActionButton, LoanList } from "@/components/LoanList";
import { PageHeader } from "@/components/ui";
import { api } from "@/convex/_generated/api";

/** Requests neighbours made for the signed-in user's tools. */
export default function IncomingPage() {
  const rows = useQuery(api.requests.incoming);
  const approve = useMutation(api.requests.approve);
  const decline = useMutation(api.requests.decline);
  const markReturned = useMutation(api.requests.markReturned);

  return (
    <>
      <PageHeader title="Incoming requests" description="Neighbours who want to borrow your tools." />
      <LoanList
        rows={rows}
        who={(r) => `Requested by ${r.borrowerName}`}
        empty="No one has requested your tools yet."
        actions={(r) => (
          <>
            {r.status === "pending" && (
              <>
                <ActionButton label="Approve" variant="primary" run={() => approve({ requestId: r._id })} />
                <ActionButton label="Decline" variant="danger" run={() => decline({ requestId: r._id })} />
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
