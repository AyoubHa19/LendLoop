"use client";

import { useMutation, useQuery } from "convex/react";
import { ActionButton, LoanList } from "@/components/LoanList";
import { PageHeader } from "@/components/ui";
import { api } from "@/convex/_generated/api";

/** Requests the signed-in user made as a borrower. */
export default function MyRequestsPage() {
  const rows = useQuery(api.requests.mine);
  const cancel = useMutation(api.requests.cancel);

  return (
    <>
      <PageHeader title="My requests" description="Tools you asked to borrow." />
      <LoanList
        rows={rows}
        who={(r) => `From ${r.lenderName}`}
        empty="You haven't requested any tools yet."
        actions={(r) =>
          r.status === "pending" && (
            <ActionButton label="Cancel" variant="danger" run={() => cancel({ requestId: r._id })} />
          )
        }
      />
    </>
  );
}
