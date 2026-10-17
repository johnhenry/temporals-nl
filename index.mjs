import { startOf } from "@johnhenry/temporals";

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
 * - `next|last|this <weekday>`, and a bare `<weekday>` (`this` and bare: the coming one, today counts;
 *   `next`: the first one strictly after today; `last`: strictly before)
 * - `next|last|this week|month|year` (period boundaries, via temporals' `startOf`)
 * - `in <n> <unit>` / `in a <unit>` · `<n> <unit> ago` — units: `minute hour day week month year`
 * - a time of day: `9am` · `9:30pm` · `17:45` · `9:15:30` · `noon` · `midnight` · `at 9` (an hour, 0 to 23),
 *   with `a.m.`/`p.m.` and `@` accepted. Alone, it is its next occurrence (a time that equals `now` has
 *   passed). With a day phrase, in either order, it sets the time on that day: `tomorrow 9am`,
 *   `9am tomorrow`, `next friday 3pm`, `at 5pm on friday`, `in 2 days at 9am`. A time goes with
 *   day-sized phrases, not with `now` or `in 2 hours`/`30 minutes ago` (those return `null`).
 *
 * A time the zone skips (02:30 when clocks go forward) lands past the jump (03:30), and one it
 * shows twice (01:30 when clocks go back) is its first reading.
 *
 * @param {string} text - The phrase to parse.
 * @param {object} [opts]
 * @param {import("temporal-polyfill").Temporal.ZonedDateTime
 *   | import("temporal-polyfill").Temporal.Instant | Date | number} [opts.now] - Reference "now"
 *   (defaults to the current instant via `Temporal.Now`). Inject for deterministic parsing/tests.
 *   An `Instant`, a `Date` or epoch milliseconds is read in `opts.zone` (default: the system zone).
 * @param {string} [opts.zone] - IANA time zone the wall clock means ("9am", "today" are in this zone).
 *   A `ZonedDateTime` `now` is moved into it; without it, `now`'s own zone is used.
 * @param {string} [opts.timeZone] - Older spelling of `zone`, honoured only when `opts.zone` is absent
 *   and `opts.now` has no zone of its own.
 * @param {"MO"|"TU"|"WE"|"TH"|"FR"|"SA"|"SU"|0|1|2|3|4|5|6|7} [opts.weekStart] - Week start for
 *   "this/next/last week" (default `"MO"`). A number is 1 = Monday … 6 = Saturday, 0 or 7 = Sunday.
 * @returns {import("temporal-polyfill").Temporal.PlainDate
 *   | import("temporal-polyfill").Temporal.ZonedDateTime | null}
 *   A `PlainDate` for date phrases, a `ZonedDateTime` for phrases with a time of day, time-relative
 *   phrases (and `"now"`), or `null` when the phrase isn't recognised.
 * @throws {RangeError} when `opts.zone` isn't a time zone.
 * @example
 * parseNatural("next monday");        // → Temporal.PlainDate
 * parseNatural("in 2 hours");         // → Temporal.ZonedDateTime
 * parseNatural("3 weeks ago");        // → Temporal.PlainDate
 * parseNatural("gibberish");          // → null
 * parseNatural("next friday 3pm", { zone: "Europe/Paris" });   // → Temporal.ZonedDateTime
 * // Deterministic with an injected clock:
 * parseNatural("tomorrow", { now: Temporal.Now.zonedDateTimeISO("America/New_York") });
 */
export function parseNatural(text, opts = {}) {
  if (typeof text !== "string") return null;
  const now = reference(opts);
  const weekStart = weekStartOf(opts.weekStart);
  const s = text.trim().toLowerCase().replace(/\s+/g, " ");

  const taken = takeTime(s);
  if (taken.bad) return null;
  if (!taken.time) return parseDate(s.replace(LEAD, ""), now, weekStart);

  // A time of day: alone, or on the day the rest of the phrase names.
  if (!now.timeZoneId) return null; // a PlainDate reference has no clock
  const { time, rest } = taken;
  if (rest === "") {
    // the next time the clock shows it; exactly now has passed
    const today = now.toPlainDate();
    const first = atTime(today, time, now);
    return first.epochNanoseconds > now.epochNanoseconds ? first : atTime(today.add({ days: 1 }), time, now);
  }
  const day = parseDate(rest, now, weekStart);
  if (!day || day.hour !== undefined) return null; // not a day, or an instant ("in 2 hours", "now")
  return atTime(day, time, now);
}

/** A date at a time of day in `now`'s zone (a skipped time lands past the jump, a repeated one is the first). */
function atTime(date, time, now) {
  return date.toZonedDateTime({ timeZone: now.timeZoneId, plainTime: time });
}

const LEAD = /^(?:(?:on|the) )+/;
const MERIDIEM = "(am|pm|a\\.m\\.|p\\.m\\.)";
const CLOCK = new RegExp(`(?:^|\\s)(?:(?:at|@)\\s*)?(noon|midnight|(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*${MERIDIEM}?|(\\d{1,2})\\s*${MERIDIEM})(?=$|\\s)`);
const BARE_HOUR = /(?:^|\s)(?:at|@)\s*(\d{1,2})(?=$|\s)/;
const tidy = (s) =>
  s.replace(/\s+/g, " ").trim().replace(/^(?:(?:at|on|of|the|@) )+/, "").replace(/(?: (?:at|on|of|the|@))+$/, "").trim();

/**
 * Take the time of day out of `s`: `{ time: { hour, minute, second }, rest }` (rest: what is left),
 * `{ time: null }` when there is none, or `{ bad: true }` when it is written like one but isn't (25:00, 13pm).
 */
function takeTime(s) {
  let m = CLOCK.exec(s);
  let time;
  if (m) {
    if (m[1] === "noon") time = { hour: 12, minute: 0, second: 0 };
    else if (m[1] === "midnight") time = { hour: 0, minute: 0, second: 0 };
    else {
      const meridiem = m[5] ?? m[7];
      let hour = Number(m[2] ?? m[6]);
      const minute = m[2] !== undefined ? Number(m[3]) : 0;
      const second = m[4] !== undefined ? Number(m[4]) : 0;
      if (meridiem) {
        if (hour < 1 || hour > 12) return { bad: true };
        hour = (hour % 12) + (meridiem[0] === "p" ? 12 : 0);
      } else if (hour > 23) return { bad: true };
      if (minute > 59 || second > 59) return { bad: true };
      time = { hour, minute, second };
    }
  } else if ((m = BARE_HOUR.exec(s))) {
    const hour = Number(m[1]);
    if (hour > 23) return { bad: true };
    time = { hour, minute: 0, second: 0 };
  } else {
    return { time: null };
  }
  return { time, rest: tidy(s.slice(0, m.index) + " " + s.slice(m.index + m[0].length)) };
}

const WEEK_STARTS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
/** "MO"…"SU" as is; 1…6 Monday…Saturday, 0 or 7 Sunday. */
function weekStartOf(weekStart) {
  if (Number.isInteger(weekStart) && weekStart >= 0 && weekStart <= 7) return WEEK_STARTS[weekStart % 7];
  return weekStart;
}

/** The reference clock as a ZonedDateTime (or, when a PlainDate is passed, the date itself). */
function reference({ now, zone, timeZone } = {}) {
  const T = globalThis.Temporal;
  if (now === undefined || now === null) return T.Now.zonedDateTimeISO(zone ?? timeZone);
  const fallback = () => zone ?? timeZone ?? T.Now.zonedDateTimeISO().timeZoneId;
  if (typeof now === "number" || now instanceof Date) return T.Instant.fromEpochMilliseconds(+now).toZonedDateTimeISO(fallback());
  if (typeof now.toZonedDateTimeISO === "function") return now.toZonedDateTimeISO(fallback()); // an Instant
  if (zone && typeof now.withTimeZone === "function") return now.withTimeZone(zone);
  return now;
}

/** A day or relative phrase (no time of day): a PlainDate, a ZonedDateTime, or null. */
function parseDate(s, now, weekStart) {
  const date = typeof now.toPlainDate === "function" ? now.toPlainDate() : now;

  if (s === "today") return date;
  if (s === "tomorrow") return date.add({ days: 1 });
  if (s === "yesterday") return date.subtract({ days: 1 });
  if (s === "now") return now;

  let m;

  // next / last / this  <weekday | week|month|year>
  if ((m = /^(next|last|this) (\w+)$/.exec(s))) {
    const [, mod, word] = m;
    if (PERIODS[word]) return period(mod, PERIODS[word], date, weekStart);
    const dow = WEEKDAYS[word];
    if (!dow) return null;
    if (mod === "next") return nextWeekday(date, dow, false);
    if (mod === "last") return lastWeekday(date, dow);
    return nextWeekday(date, dow, true); // "this": the coming one, today counts
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

/** Resolve "next|last|this <week|month|year>" to that period's start date, via temporals' `startOf`. */
function period(mod, unit, date, weekStart = "MO") {
  const base = startOf(date, unit, { weekStart });
  const step = { [unit === "week" ? "weeks" : `${unit}s`]: 1 };
  if (mod === "next") return base.add(step);
  if (mod === "last") return base.subtract(step);
  return base; // "this"
}
