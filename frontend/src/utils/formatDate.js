/** Date/time formatting used across triage tables, case history, and feedback logs. */

export function formatDate(isoString, options) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, options ?? { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3 minutes ago", "2 hours ago", "5 days ago" — used in feedback history / notifications. */
export function timeAgo(isoString) {
  if (!isoString) return "—";
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSeconds = Math.floor((Date.now() - then) / 1000);

  const units = [
    { limit: 60, label: "second" },
    { limit: 3600, label: "minute", divisor: 60 },
    { limit: 86400, label: "hour", divisor: 3600 },
    { limit: 2592000, label: "day", divisor: 86400 },
    { limit: Infinity, label: "month", divisor: 2592000 },
  ];

  if (diffSeconds < 60) return "just now";

  for (const unit of units) {
    if (diffSeconds < unit.limit) {
      const value = Math.floor(diffSeconds / (unit.divisor ?? 1));
      return `${value} ${unit.label}${value !== 1 ? "s" : ""} ago`;
    }
  }
  return formatDate(isoString);
}

/** mm:ss countdown used by Case Velocity ("4.2m left" style, but precise). */
export function formatMinutesLeft(remainingMinutes) {
  if (remainingMinutes <= 0) return "Overdue";
  return `${remainingMinutes.toFixed(1)}m left`;
}
