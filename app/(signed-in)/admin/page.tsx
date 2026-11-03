"use client";

import { useMutation } from "convex/react";
import { ShieldCheck } from "lucide-react";
import { ActionButton, LoanList } from "@/components/LoanList";
import { Empty, Loading, PageHeader, Status } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { useSignedInQuery } from "@/lib/useSignedInQuery";
import { timeAgo } from "@/lib/dates";

/**
 * Admin overview. Non-admins are refused by Convex itself (requireAdmin);
 * this page only decides what to show.
 */
export default function AdminPage() {
  const me = useSignedInQuery(api.users.me, {});

  if (me === undefined) return <Loading />;
  if (!me?.isAdmin) return <Empty title="This page is for admins" />;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const loans = useSignedInQuery(api.admin.allLoans, {});
  const users = useSignedInQuery(api.admin.users, {});
  const problems = useSignedInQuery(api.admin.automationProblems, {});
  const setTrusted = useMutation(api.admin.setTrustedLender);

  return (
    <>
      <PageHeader
        title="Admin"
        description="Members, every loan, and anything the automations couldn't do. Remove listings from All tools."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex flex-col gap-3" aria-labelledby="loans-title">
          <h2 id="loans-title" className="text-[15px] font-medium">
            All loans
          </h2>
          <LoanList
            rows={loans}
            who={(r) => `${r.lenderName} lends to ${r.borrowerName}`}
            empty={{ title: "No loan requests yet" }}
          />
        </section>

        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3" aria-labelledby="problems-title">
            <h2 id="problems-title" className="text-[15px] font-medium">
              Automation problems
            </h2>
            {problems === undefined ? (
              <Loading />
            ) : problems.length === 0 ? (
              <p className="rounded-xl border border-line bg-surface p-5 text-sm text-fg-2 shadow-card">
                Every notification and reminder went through.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface shadow-card">
                {problems.map((p) => (
                  <li key={p._id} className="flex flex-col gap-1.5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Status tone="negative">{p.kind === "workflow_error" ? "Workflow failed" : "Not delivered"}</Status>
                      <span className="font-mono text-xs text-fg-3">{timeAgo(p.at)}</span>
                    </div>
                    <p className="text-[13px] leading-5 text-fg-2">{p.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="members-title">
            <h2 id="members-title" className="text-[15px] font-medium">
              Members
            </h2>
            {users === undefined ? (
              <Loading />
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface shadow-card">
                {users.map((u) => (
                  <li key={u._id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1.5 truncate text-sm">
                        {u.name}
                        {u.trustedLender && <ShieldCheck size={14} strokeWidth={1.5} className="text-fg-2" aria-label="Trusted Lender" />}
                      </span>
                      <span className="text-xs text-fg-3">{u.isAdmin ? "Admin" : u.trustedLender ? "Trusted Lender" : "Member"}</span>
                    </div>
                    <ActionButton
                      label={u.trustedLender ? "Remove trust" : "Mark trusted"}
                      variant="ghost"
                      run={() => setTrusted({ userId: u._id, trusted: !u.trustedLender })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
