# @johnhenry/temporals-nl

> **Renamed.** This package was previously published as the unscoped `temporals-nl`. It is now `@johnhenry/temporals-nl` and depends on `@johnhenry/temporals`. See [Migrating from `temporals-nl`](#migrating-from-temporals-nl).

Natural-language date parsing — a **separate extension** that wraps
[`@johnhenry/temporals`](https://github.com/johnhenry/temporals).

It lives outside the core on purpose: NL parsing is fuzzy, locale-heavy, and a
fundamentally different concern from `temporals`' deterministic time generation.
Keeping it here means the core stays lean and this can evolve (or be swapped for
a heavier parser like `chrono`) independently.

## Install

```sh
npm install @johnhenry/temporals-nl
```

Requires **Node >= 26** (the same floor as `@johnhenry/temporals`, which this wraps), where
`Temporal` is built in. In a browser or runtime without a global `Temporal`, load a polyfill
first (`temporal-polyfill` is installed as a dependency) — the parser reads `globalThis.Temporal`.

## Usage

```js
import "temporal-polyfill/global"; // only where there is no native Temporal (e.g. older browsers)
import { parseNatural } from "@johnhenry/temporals-nl";

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
for phrases with a time of day, time-relative phrases (and `"now"`), or `null` when
the phrase isn't recognised.

**`options`**

| option | type | default | meaning |
| --- | --- | --- | --- |
| `now` | `Temporal.ZonedDateTime \| Temporal.Instant \| Date \| number` | current instant | Reference "now"; inject for deterministic parsing/tests. An `Instant`, `Date` or epoch-ms number is read in `zone` |
| `zone` | `string` | `now`'s own zone, else the system zone | IANA zone the wall clock means (`9am`, `today`). A `ZonedDateTime` `now` is moved into it. Throws `RangeError` if it isn't a zone |
| `timeZone` | `string` | system zone | Older spelling of `zone`; used only when `zone` is absent and `now` carries no zone |
| `weekStart` | `"MO"…"SU"` or `0`…`7` | `"MO"` | Week start for `this/next/last week` (numbers: 1 = Monday … 6 = Saturday, 0 or 7 = Sunday) |

A full, generated API reference lives at
**https://johnhenry.github.io/temporals-nl/** (`npm run docs` builds it locally).

## Grammar

Case-insensitive; extra whitespace is tolerated.

| Pattern | Example | Result type |
| --- | --- | --- |
| `today` / `tomorrow` / `yesterday` | `tomorrow` | `PlainDate` |
| `now` | `now` | `ZonedDateTime` |
| `next\|last\|this <weekday>` | `next monday` | `PlainDate` |
| bare `<weekday>` or `this <weekday>` (the coming one; today counts) | `friday`, `this friday` | `PlainDate` |
| `next\|last\|this week\|month\|year` | `last month` | `PlainDate` |
| `in <n> <unit>` / `in a <unit>` | `in 3 days`, `in a week` | date unit → `PlainDate`; time unit → `ZonedDateTime` |
| `<n> <unit> ago` | `2 weeks ago` | as above |
| time of day alone (its next occurrence) | `9am`, `9:30pm`, `17:45`, `9:15:30`, `noon`, `midnight`, `at 9` | `ZonedDateTime` |
| day + time, either order | `tomorrow 9am`, `9am tomorrow`, `next friday 3pm`, `at 5pm on friday` | `ZonedDateTime` |
| `in <n> day\|week\|month\|year [at] <time>` | `in 2 days at 9am` | `ZonedDateTime` |

Units: `minute` `hour` `day` `week` `month` `year` (plus `min`/`sec` aliases).
This is deliberately a **starter** grammar — extend the small rule set in
[`index.mjs`](index.mjs) as needed.

## Relationship to `temporals`

Depends on `@johnhenry/temporals` (range `^0.1.0 || ^0.2.0`; Node >=26, the same floor as
`temporals` itself) and uses its `startOf` for period boundaries. It needs no specific `temporals`
feature beyond that, and is tested against both 0.1 and 0.2. It is **not** a replacement for `temporals` — it's
a thin, opinionated convenience layer on top.

## Develop

```sh
npm install        # @johnhenry/temporals + temporal-polyfill from npm
npm test           # node:test suite
npm run examples   # run examples/*.mjs
npm run docs       # generate the TypeDoc API reference into docs/
```

## Migrating from `temporals-nl`

The unscoped `temporals-nl` package (0.0.x) is deprecated. To migrate:

```sh
npm uninstall temporals-nl temporals
npm install @johnhenry/temporals-nl
```

and update imports:

```diff
-import { parseNatural } from "temporals-nl";
+import { parseNatural } from "@johnhenry/temporals-nl";
```

Behaviour of `parseNatural` is unchanged. Other changes: it now depends on
`@johnhenry/temporals` (replacing the deprecated unscoped `temporals`
`0.0.x`) and requires Node >=26, matching the rest of the family.
