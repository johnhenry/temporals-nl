import { test } from "node:test";
import assert from "node:assert/strict";
import "temporal-polyfill/global";
import { parseNatural } from "./index.mjs";

// Fixed reference: 2026-06-30 is a Tuesday.
const now = Temporal.ZonedDateTime.from("2026-06-30T09:00[America/New_York]");
const p = (s) => parseNatural(s, { now });
const str = (s) => p(s)?.toString();

test("literals", () => {
  assert.equal(str("today"), "2026-06-30");
  assert.equal(str("tomorrow"), "2026-07-01");
  assert.equal(str("yesterday"), "2026-06-29");
  assert.equal(str("now"), "2026-06-30T09:00:00-04:00[America/New_York]");
});

test("weekdays", () => {
  assert.equal(str("next monday"), "2026-07-06");
  assert.equal(str("last friday"), "2026-06-26");
  assert.equal(str("tuesday"), "2026-06-30"); // today counts for a bare weekday
  assert.equal(str("this thursday"), "2026-07-02");
});

test("relative date units", () => {
  assert.equal(str("in 3 days"), "2026-07-03");
  assert.equal(str("in a week"), "2026-07-07");
  assert.equal(str("2 weeks ago"), "2026-06-16");
  assert.equal(str("in 1 month"), "2026-07-30");
});

test("relative time units return a zoned datetime", () => {
  assert.equal(str("in 2 hours"), "2026-06-30T11:00:00-04:00[America/New_York]");
  assert.equal(str("30 minutes ago"), "2026-06-30T08:30:00-04:00[America/New_York]");
});

test("periods via temporals startOf", () => {
  assert.equal(str("next week"), "2026-07-06"); // Monday of next week
  assert.equal(str("last month"), "2026-05-01");
  assert.equal(str("this year"), "2026-01-01");
});

test("unknown input returns null", () => {
  assert.equal(p("sometime next quarter maybe"), null);
  assert.equal(p("gibberish"), null);
});

// --- times of day (issue #5) -------------------------------------------------

// Wednesday 2026-10-14 10:30 UTC, read in a few zones.
const instant = Temporal.Instant.from("2026-10-14T10:30:00Z");
const at = (text, extra = {}) => {
  const r = parseNatural(text, { now: instant, zone: "UTC", ...extra });
  assert.ok(r, `"${text}" should parse`);
  assert.equal(r.constructor.name, "ZonedDateTime", `"${text}" should be a ZonedDateTime`);
  return r.toInstant().toString();
};

test("clock times: 9am, 9:30pm, 17:45, noon, midnight, at 9", () => {
  assert.equal(at("11am"), "2026-10-14T11:00:00Z"); // later today
  assert.equal(at("9am"), "2026-10-15T09:00:00Z"); // already passed: tomorrow
  assert.equal(at("9:30pm"), "2026-10-14T21:30:00Z");
  assert.equal(at("17:45"), "2026-10-14T17:45:00Z");
  assert.equal(at("9:15:30"), "2026-10-15T09:15:30Z");
  assert.equal(at("noon"), "2026-10-14T12:00:00Z");
  assert.equal(at("midnight"), "2026-10-15T00:00:00Z");
  assert.equal(at("at 9"), "2026-10-15T09:00:00Z");
  assert.equal(at("at 9:30"), "2026-10-15T09:30:00Z");
  assert.equal(at("@ 6pm"), "2026-10-14T18:00:00Z");
  assert.equal(at("9 A.M."), "2026-10-15T09:00:00Z");
  assert.equal(at("12am"), "2026-10-15T00:00:00Z");
  assert.equal(at("12pm"), "2026-10-14T12:00:00Z");
  assert.equal(at("  AT   NOON "), "2026-10-14T12:00:00Z");
});

test("a time alone is its next occurrence; exactly now has passed", () => {
  assert.equal(at("10:30"), "2026-10-15T10:30:00Z");
  assert.equal(at("10:31"), "2026-10-14T10:31:00Z");
});

test("a day plus a time, in either order", () => {
  assert.equal(at("tomorrow 9am"), "2026-10-15T09:00:00Z");
  assert.equal(at("tomorrow at 9am"), "2026-10-15T09:00:00Z");
  assert.equal(at("9am tomorrow"), "2026-10-15T09:00:00Z");
  assert.equal(at("tomorrow at noon"), "2026-10-15T12:00:00Z");
  assert.equal(at("tomorrow at midnight"), "2026-10-15T00:00:00Z");
  assert.equal(at("tomorrow 17:45"), "2026-10-15T17:45:00Z");
  assert.equal(at("today at 8am"), "2026-10-14T08:00:00Z"); // explicitly today, though it has passed
  assert.equal(at("yesterday 9am"), "2026-10-13T09:00:00Z");
});

test("weekday plus time: bare and this are the coming one (today counts), next is strictly after today", () => {
  assert.equal(at("next friday 3pm"), "2026-10-16T15:00:00Z");
  assert.equal(at("friday at 3pm"), "2026-10-16T15:00:00Z");
  assert.equal(at("this friday 3pm"), "2026-10-16T15:00:00Z");
  assert.equal(at("at 5pm on friday"), "2026-10-16T17:00:00Z");
  assert.equal(at("Mon 9:30"), "2026-10-19T09:30:00Z");
  assert.equal(at("wednesday 3pm"), "2026-10-14T15:00:00Z"); // today is a Wednesday
  assert.equal(at("next wednesday 3pm"), "2026-10-21T15:00:00Z");
  assert.equal(at("last wednesday 3pm"), "2026-10-07T15:00:00Z");
  // "this monday" on a Wednesday is the coming Monday, not the one just gone
  assert.equal(at("this monday 9am"), "2026-10-19T09:00:00Z");
  assert.equal(parseNatural("this monday", { now: instant, zone: "UTC" }).toString(), "2026-10-19");
});

test("in N days/weeks/months/years at a time", () => {
  assert.equal(at("in 2 days at 9am"), "2026-10-16T09:00:00Z");
  assert.equal(at("in 2 days 9am"), "2026-10-16T09:00:00Z");
  assert.equal(at("in a week at noon"), "2026-10-21T12:00:00Z");
  assert.equal(at("in 1 month at 8:15am"), "2026-11-14T08:15:00Z");
  assert.equal(at("2 days ago at 9am"), "2026-10-12T09:00:00Z");
});

test("a time of day does not go with hours or minutes, or with now", () => {
  for (const bad of ["in 2 hours at 9am", "in 30 minutes 9am", "now 9am", "2 hours ago at noon"]) {
    assert.equal(parseNatural(bad, { now: instant, zone: "UTC" }), null, bad);
  }
});

test("invalid clock times return null", () => {
  for (const bad of ["25:00", "9:75", "13pm", "0am", "at 25", "at", "tomorrow at", "tomorrow 9am 10am", "friday friday 9am", "9"]) {
    assert.equal(parseNatural(bad, { now: instant, zone: "UTC" }), null, bad);
  }
});

test("the zone decides what the wall clock means (now as an instant, a number or a ZonedDateTime)", () => {
  const paris = parseNatural("tomorrow 9am", { now: instant, zone: "Europe/Paris" }); // 12:30 in Paris on the 14th (CEST)
  assert.equal(paris.toString(), "2026-10-15T09:00:00+02:00[Europe/Paris]");
  assert.equal(parseNatural("tomorrow 9am", { now: instant.epochMilliseconds, zone: "America/New_York" }).toString(), "2026-10-15T09:00:00-04:00[America/New_York]");
  assert.equal(parseNatural("9am", { now: new Date(instant.epochMilliseconds), zone: "Asia/Tokyo" }).toString(), "2026-10-15T09:00:00+09:00[Asia/Tokyo]");
  // today in the zone, not in UTC: 23:30 UTC on the 14th is already the 15th in Tokyo
  const late = Temporal.Instant.from("2026-10-14T23:30:00Z");
  assert.equal(parseNatural("today 8am", { now: late, zone: "Asia/Tokyo" }).toString(), "2026-10-15T08:00:00+09:00[Asia/Tokyo]");
  // a ZonedDateTime now keeps its own zone unless `zone` says otherwise
  const zdt = Temporal.ZonedDateTime.from("2026-10-14T06:30[America/New_York]");
  assert.equal(parseNatural("9am", { now: zdt }).toString(), "2026-10-14T09:00:00-04:00[America/New_York]");
  assert.equal(parseNatural("9am", { now: zdt, zone: "Europe/Paris" }).toString(), "2026-10-15T09:00:00+02:00[Europe/Paris]");
});

test("daylight saving: a time the clock skips lands on the jump, a repeated time is its first reading", () => {
  const eve = Temporal.ZonedDateTime.from("2026-03-07T12:00[America/New_York]");
  assert.equal(parseNatural("tomorrow 2:30am", { now: eve }).toString(), "2026-03-08T03:30:00-04:00[America/New_York]"); // 02:30 doesn't exist
  assert.equal(parseNatural("tomorrow at 2am", { now: eve }).toString(), "2026-03-08T03:00:00-04:00[America/New_York]");
  const eve2 = Temporal.ZonedDateTime.from("2026-10-31T12:00[America/New_York]");
  assert.equal(parseNatural("tomorrow 1:30am", { now: eve2 }).toString(), "2026-11-01T01:30:00-04:00[America/New_York]"); // the first 01:30
  // a time alone: tonight's skipped hour is still "next"
  const nightBefore = Temporal.ZonedDateTime.from("2026-03-07T23:00[America/New_York]");
  assert.equal(parseNatural("2:30am", { now: nightBefore }).toString(), "2026-03-08T03:30:00-04:00[America/New_York]");
  // the day after the change is an ordinary day with the new offset
  assert.equal(parseNatural("in 2 days 9am", { now: eve }).toString(), "2026-03-09T09:00:00-04:00[America/New_York]");
});

test("weekStart accepts MO..SU and 0..7 (0 and 7 are Sunday) for weeks", () => {
  const pw = (text, weekStart) => parseNatural(text, { now: instant, zone: "UTC", weekStart })?.toString();
  assert.equal(pw("next week"), "2026-10-19");
  assert.equal(pw("next week", "SU"), "2026-10-18");
  assert.equal(pw("next week", 0), "2026-10-18");
  assert.equal(pw("next week", 7), "2026-10-18");
  assert.equal(pw("next week", 1), "2026-10-19");
  assert.equal(pw("this week", 3), "2026-10-14");
  assert.equal(pw("this week", "WE"), "2026-10-14");
});
