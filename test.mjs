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
