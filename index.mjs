import { startOf } from "temporals";

/**
 * temporals-nl — a small natural-language date parser that **wraps** `temporals`.
 * Kept as a separate extension on purpose: NL parsing is fuzzy and locale-heavy,
 * a different concern from `temporals`' deterministic time generation.
 *
 * `parseNatural(text, opts)` returns a `Temporal.PlainDate` for date phrases, a
 * `Temporal.ZonedDateTime` for time-relative phrases (and "now"), or `null` when
 * the phrase isn't understood. Starter grammar — extend as needed.
 */

const WEEKDAYS = {
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  sunday: 7, sun: 7,
};

// Singular unit → Temporal duration field.
const UNITS = {
  day: "days", week: "weeks", month: "months", year: "years",
  hour: "hours", minute: "minutes", min: "minutes", second: "seconds", sec: "seconds",
};
const PERIODS = { week: "week", month: "month", year: "year" };
const TIME_FIELDS = new Set(["hours", "minutes", "seconds"]);

/**
 * Parse a natural-language date/time phrase into a Temporal value.
 *
 * Recognised forms (case-insensitive, extra whitespace tolerated):
 * - `today` · `tomorrow` · `yesterday` · `now`
 * - `next|last|this <weekday>`, and a bare `<weekday>` (the next such day — today counts)
 * - `next|last|this week|month|year` (period boundaries, via temporals' `startOf`)
 * - `in <n> <unit>` / `in a <unit>` · `<n> <unit> ago` — units: `minute hour day week month year`
 *
 * @param {string} text - The phrase to parse.
 * @param {object} [opts]
 * @param {import("temporal-polyfill").Temporal.ZonedDateTime} [opts.now] - Reference "now"
 *   (defaults to the current instant via `Temporal.Now`). Inject for deterministic parsing/tests.
 * @param {string} [opts.timeZone] - IANA time zone used when `opts.now` is omitted.
 * @param {"MO"|"TU"|"WE"|"TH"|"FR"|"SA"|"SU"} [opts.weekStart] - Week start for
 *   "this <weekday>" and "this/next/last week" (default `"MO"`).
 * @returns {import("temporal-polyfill").Temporal.PlainDate
 *   | import("temporal-polyfill").Temporal.ZonedDateTime | null}
 *   A `PlainDate` for date phrases, a `ZonedDateTime` for time-relative phrases (and `"now"`),
 *   or `null` when the phrase isn't recognised.
 * @example
 * parseNatural("next monday");        // → Temporal.PlainDate
 * parseNatural("in 2 hours");         // → Temporal.ZonedDateTime
 * parseNatural("3 weeks ago");        // → Temporal.PlainDate
 * parseNatural("gibberish");          // → null
 * // Deterministic with an injected clock:
 * parseNatural("tomorrow", { now: Temporal.Now.zonedDateTimeISO("America/New_York") });
 */
export function parseNatural(text, opts = {}) {
  const T = globalThis.Temporal;
  const now = opts.now ?? T.Now.zonedDateTimeISO(opts.timeZone);
  const date = typeof now.toPlainDate === "function" ? now.toPlainDate() : now;
  const s = text.trim().toLowerCase().replace(/\s+/g, " ");

  if (s === "today") return date;
  if (s === "tomorrow") return date.add({ days: 1 });
  if (s === "yesterday") return date.subtract({ days: 1 });
  if (s === "now") return now;

  let m;

  // next / last / this  <weekday | week|month|year>
  if ((m = /^(next|last|this) (\w+)$/.exec(s))) {
    const [, mod, word] = m;
    if (PERIODS[word]) return period(mod, PERIODS[word], date, opts.weekStart);
    const dow = WEEKDAYS[word];
    if (!dow) return null;
    if (mod === "next") return nextWeekday(date, dow, false);
    if (mod === "last") return lastWeekday(date, dow);
    return thisWeekday(date, dow, opts.weekStart); // "this"
  }

  // bare weekday → the next such day (today counts)
  if (WEEKDAYS[s]) return nextWeekday(date, WEEKDAYS[s], true);

  // in N <unit>  /  in a <unit>
  if ((m = /^in (\d+|an?|the) (\w+?)s? ?(?:from now)?$/.exec(s))) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1;
    const field = UNITS[m[2]];
    if (!field) return null;
    const dur = { [field]: n };
    return TIME_FIELDS.has(field) ? now.add(dur) : date.add(dur);
  }

  // N <unit> ago
  if ((m = /^(\d+) (\w+?)s? ago$/.exec(s))) {
    const field = UNITS[m[2]];
    if (!field) return null;
    const dur = { [field]: Number(m[1]) };
    return TIME_FIELDS.has(field) ? now.subtract(dur) : date.subtract(dur);
  }

  return null;
}

/** The next date falling on weekday `dow` (1=Mon…7=Sun) at/after `date`; `inclusive` lets today count. */
function nextWeekday(date, dow, inclusive) {
  let delta = (dow - date.dayOfWeek + 7) % 7;
  if (delta === 0 && !inclusive) delta = 7;
  return date.add({ days: delta });
}

/** The most recent date on weekday `dow` strictly before `date`. */
function lastWeekday(date, dow) {
  let delta = (date.dayOfWeek - dow + 7) % 7;
  if (delta === 0) delta = 7;
  return date.subtract({ days: delta });
}

/** The date on weekday `dow` within `date`'s own week (week bounded by `weekStart`). */
function thisWeekday(date, dow, weekStart = "MO") {
  const weekStartDate = startOf(date, "week", { weekStart });
  return weekStartDate.add({ days: (dow - weekStartDate.dayOfWeek + 7) % 7 });
}

/** Resolve "next|last|this <week|month|year>" to that period's start date, via temporals' `startOf`. */
function period(mod, unit, date, weekStart = "MO") {
  const base = startOf(date, unit, { weekStart });
  const step = { [unit === "week" ? "weeks" : `${unit}s`]: 1 };
  if (mod === "next") return base.add(step);
  if (mod === "last") return base.subtract(step);
  return base; // "this"
}
