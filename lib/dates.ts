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

/**
 * A loan's dates, short: "4–7 Nov", "30 Nov – 2 Dec", "28 Dec 2026 – 3 Jan 2027".
 * The year appears only when it isn't the current one or the range crosses it.
 */
export function formatRange(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const month = (m: number) =>
    new Date(Date.UTC(2000, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const thisYear = new Date().getUTCFullYear();
  const withYear = sy !== ey || sy !== thisYear;
  const y = (year: number) => (withYear ? ` ${year}` : "");

  if (start === end) return `${sd} ${month(sm)}${y(sy)}`;
  if (sy === ey && sm === em) return `${sd}–${ed} ${month(sm)}${y(sy)}`;
  return `${sd} ${month(sm)}${y(sy)} – ${ed} ${month(em)}${y(ey)}`;
}
