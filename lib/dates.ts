/** Today as "YYYY-MM-DD" in UTC, matching how the backend compares dates. */
export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

/** "2026-11-04" -> "4 Nov 2026". */
export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** An approved loan whose last day has passed. */
export function isOverdue(loan: { status: string; endDate: string }) {
  return loan.status === "approved" && loan.endDate < todayUtc();
}
