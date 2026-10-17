# Changelog

## 0.2.0

- Times of day (#5): `9am`, `9:30pm`, `17:45`, `9:15:30`, `noon`, `midnight`, `at 9`, alone (their next
  occurrence) or with a day phrase in either order (`tomorrow 9am`, `9am tomorrow`, `next friday 3pm`,
  `in 2 days at 9am`). They return a `Temporal.ZonedDateTime`, correct across daylight saving changes
  (a skipped time lands past the jump, a repeated one is its first reading).
- New `zone` option (the zone the wall clock means; moves a `ZonedDateTime` `now`). `now` also accepts a
  `Temporal.Instant`, a `Date` or epoch milliseconds. `weekStart` also accepts `0`-`7` (0 and 7 are Sunday).
- Changed: `this <weekday>` is now the coming one, today included (same as a bare weekday), instead of
  the weekday within the current week.
- `@johnhenry/temporals` range widened to `^0.1.0 || ^0.2.0` (0.2.0 is outside `^0.1.0`). Node >=26
  stays: it is `temporals`' own floor. README no longer suggests Node < 22.

## 0.1.0

- Renamed to `@johnhenry/temporals-nl`; depends on `@johnhenry/temporals`.
