# temporals-nl

Natural-language date parsing — a **separate extension** that wraps
[`temporals`](https://github.com/johnhenry/temporals).

It lives outside the core on purpose: NL parsing is fuzzy, locale-heavy, and a
fundamentally different concern from `temporals`' deterministic time generation.
Keeping it here means the core stays lean and this can evolve (or be swapped for
a heavier parser like `chrono`) independently.

## Usage

```js
import "temporal-polyfill/global"; // only on Node < 22
import { parseNatural } from "temporals-nl";

parseNatural("next monday");     // → Temporal.PlainDate
parseNatural("in 2 hours");      // → Temporal.ZonedDateTime
parseNatural("3 weeks ago");     // → Temporal.PlainDate
parseNatural("this year");       // → Temporal.PlainDate (uses temporals' startOf)
parseNatural("gibberish");       // → null

// Inject a reference clock (great for tests / deterministic parsing):
parseNatural("tomorrow", { now: Temporal.Now.zonedDateTimeISO("America/New_York") });
```

Returns a `Temporal.PlainDate` for date phrases, a `Temporal.ZonedDateTime` for
time-relative phrases (and `"now"`), or `null` when unrecognized.

## Grammar (starter)

- `today` · `tomorrow` · `yesterday` · `now`
- `next|last|this <weekday>` · a bare `<weekday>` (next such day, today counts)
- `next|last|this week|month|year` (period boundaries, via `temporals`' `startOf`)
- `in N <unit>` / `in a <unit>` · `N <unit> ago` — units: `minute hour day week month year`

Deliberately a starter subset. Extend the small rule set in `index.mjs` as needed.

## Run

```sh
npm install   # installs temporals + temporal-polyfill from npm
npm test
```
