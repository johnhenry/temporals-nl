# temporals-nl

Natural-language date parsing — a **separate extension** that wraps
[`temporals`](https://github.com/johnhenry/temporals).

It lives outside the core on purpose: NL parsing is fuzzy, locale-heavy, and a
fundamentally different concern from `temporals`' deterministic time generation.
Keeping it here means the core stays lean and this can evolve (or be swapped for
a heavier parser like `chrono`) independently.

## Install

```sh
npm install temporals-nl
# On Node < 22, also:
npm install temporal-polyfill
```

## Usage

```js
import "temporal-polyfill/global"; // only on Node < 22
import { parseNatural } from "temporals-nl";

parseNatural("next monday");     // → Temporal.PlainDate
parseNatural("in 2 hours");      // → Temporal.ZonedDateTime
parseNatural("3 weeks ago");     // → Temporal.PlainDate
parseNatural("this year");       // → Temporal.PlainDate (uses temporals' startOf)
parseNatural("gibberish");       // → null

// Inject a reference clock — great for tests / deterministic parsing:
parseNatural("tomorrow", { now: Temporal.Now.zonedDateTimeISO("America/New_York") });
```

## API

### `parseNatural(text, options?)`

Parse a natural-language phrase into a Temporal value.

**Returns** a `Temporal.PlainDate` for date phrases, a `Temporal.ZonedDateTime`
for time-relative phrases (and `"now"`), or `null` when the phrase isn't
recognised.

**`options`**

| option | type | default | meaning |
| --- | --- | --- | --- |
| `now` | `Temporal.ZonedDateTime` | current instant | Reference "now"; inject for deterministic parsing/tests |
| `timeZone` | `string` | system zone | IANA zone used only when `now` is omitted |
| `weekStart` | `"MO"…"SU"` | `"MO"` | Week start for `this <weekday>` and `this/next/last week` |

A full, generated API reference lives at
**https://johnhenry.github.io/temporals-nl/** (`npm run docs` builds it locally).

## Grammar

Case-insensitive; extra whitespace is tolerated.

| Pattern | Example | Result type |
| --- | --- | --- |
| `today` / `tomorrow` / `yesterday` | `tomorrow` | `PlainDate` |
| `now` | `now` | `ZonedDateTime` |
| `next\|last\|this <weekday>` | `next monday` | `PlainDate` |
| bare `<weekday>` (next such day; today counts) | `friday` | `PlainDate` |
| `next\|last\|this week\|month\|year` | `last month` | `PlainDate` |
| `in <n> <unit>` / `in a <unit>` | `in 3 days`, `in a week` | date unit → `PlainDate`; time unit → `ZonedDateTime` |
| `<n> <unit> ago` | `2 weeks ago` | as above |

Units: `minute` `hour` `day` `week` `month` `year` (plus `min`/`sec` aliases).
This is deliberately a **starter** grammar — extend the small rule set in
[`index.mjs`](index.mjs) as needed.

## Relationship to `temporals`

Depends on `temporals` (range `0.0.x`) and uses its `startOf` for period
boundaries. It needs no specific `temporals` feature beyond that, so it tracks
patch releases automatically. It is **not** a replacement for `temporals` — it's
a thin, opinionated convenience layer on top.

## Develop

```sh
npm install        # temporals + temporal-polyfill from npm
npm test           # node:test suite
npm run examples   # run examples/*.mjs
npm run docs       # generate the TypeDoc API reference into docs/
```
