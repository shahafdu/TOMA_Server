export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function money(value?: number | null): string | null {
  if (value == null) return null;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Human training hours, e.g. `8h` or `1.5h`. */
export function hours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}h`;
}

/** Calendar quarter (1–4) an ISO datetime falls in. */
export function quarterOf(iso: string): number {
  return Math.floor(new Date(iso).getMonth() / 3) + 1;
}

type Session = { startsAt: string; endsAt: string };

/** Distinct quarters (ascending) that a training's sessions span. */
export function quartersOf(sessions: Session[]): number[] {
  const set = new Set<number>();
  for (const s of sessions) set.add(quarterOf(s.startsAt));
  return [...set].sort((a, b) => a - b);
}

const sortSessions = (sessions: Session[]): Session[] =>
  [...sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

/**
 * A compact date-range headline for a card: a single day (`12 Mar 2026`), a same-month
 * range (`12–14 Mar 2026`), or a cross-month range (`28 Mar – 3 Apr 2026`).
 */
export function dateRangeLabel(sessions: Session[]): string | null {
  const sorted = sortSessions(sessions);
  if (sorted.length === 0) return null;
  const first = new Date(sorted[0]!.startsAt);
  const last = new Date(sorted[sorted.length - 1]!.endsAt);

  const sameDay = first.toDateString() === last.toDateString();
  if (sameDay) return formatDate(sorted[0]!.startsAt);

  const day = (d: Date) => d.getDate();
  const monthYear = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });

  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return `${day(first)}–${day(last)} ${monthYear(last)}`;
  }
  if (first.getFullYear() === last.getFullYear()) {
    return `${day(first)} ${month(first)} – ${day(last)} ${monthYear(last)}`;
  }
  return `${formatDate(sorted[0]!.startsAt)} – ${formatDate(sorted[sorted.length - 1]!.endsAt)}`;
}

/** One line per session for a tooltip: `Wed, 12 Mar 2026 · 09:00–12:00`. */
export function sessionLines(sessions: Session[]): string[] {
  return sortSessions(sessions).map((s) => {
    const day = new Date(s.startsAt).toLocaleDateString(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${day} · ${formatTime(s.startsAt)}–${formatTime(s.endsAt)}`;
  });
}
