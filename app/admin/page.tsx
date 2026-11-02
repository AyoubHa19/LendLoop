"use client";

import { useMutation, useQuery } from "convex/react";
import { ActionButton, LoanList } from "@/components/LoanList";
import { Badge, Card, Empty, Loading, PageHeader } from "@/components/ui";
import { api } from "@/convex/_generated/api";

/**
 * Admin overview. Non-admins are refused by Convex itself (requireAdmin);
 * this page only decides what to show.
 */
export default function AdminPage() {
  const me = useQuery(api.users.me);

  if (me === undefined) return <Loading />;
  if (!me?.isAdmin) return <Empty>This page is for admins only.</Empty>;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const loans = useQuery(api.admin.allLoans);
  const users = useQuery(api.admin.users);
  const setTrusted = useMutation(api.admin.setTrustedLender);

  return (
    <>
      <PageHeader
        title="Admin"
        description="All loans, and Trusted Lender badges. Remove listings from the All tools page."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Members</h2>
        {users === undefined ? (
          <Loading />
        ) : (
          <Card>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((u) => (
                <li key={u._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2">
                    {u.name}
                    {u.isAdmin && <Badge>Admin</Badge>}
                    {u.trustedLender && <Badge tone="blue">Trusted Lender</Badge>}
                  </span>
                  <ActionButton
                    label={u.trustedLender ? "Remove Trusted Lender" : "Mark Trusted Lender"}
                    run={() => setTrusted({ userId: u._id, trusted: !u.trustedLender })}
                  />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">All loans</h2>
        <LoanList
          rows={loans}
          who={(r) => `${r.lenderName} → ${r.borrowerName}`}
          empty="No loan requests yet."
        />
      </section>
    </>
  );
}
