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

/** 1793000000000 -> "2 days ago". */
export function timeAgo(ms: number, now = Date.now()) {
  const minutes = Math.round((now - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
