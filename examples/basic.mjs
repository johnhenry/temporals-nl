// Runnable tour of temporals-nl.  node examples/basic.mjs
import "temporal-polyfill/global"; // only needed on Node < 22
import { parseNatural } from "temporals-nl";

// A fixed reference clock makes output deterministic (2026-06-30 is a Tuesday).
const ref = Temporal.ZonedDateTime.from("2026-06-30T09:00[America/New_York]");

const show = (phrase) => console.log(`  ${phrase.padEnd(16)} -> ${parseNatural(phrase, { now: ref }) ?? "null"}`);

console.log("Relative to 2026-06-30 (Tuesday):");
for (const p of [
  "today", "tomorrow", "yesterday", "now",
  "next monday", "last friday", "friday", "this thursday",
  "in 3 days", "in a week", "2 weeks ago", "in 2 hours", "30 minutes ago",
  "next week", "last month", "this year",
  "sometime soon", // unrecognised -> null
]) {
  show(p);
}
