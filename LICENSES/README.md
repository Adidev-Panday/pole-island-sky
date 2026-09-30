# Redistributed data licenses

This app's own code is MIT-licensed (see `LICENSE` at the repo root). Some
of the *data files* it redistributes under `data/` and `public/data/`
come from other projects, under their own licenses, listed here.

| File | Source | License | Text |
| --- | --- | --- | --- |
| `data/stars.json`, `public/data/stars.json` | [HYG Database v4.1](https://codeberg.org/astronexus/hyg) (Astronexus / David Nash) — filtered to mag &le; 6.5 by `scripts/build-star-catalog.ts` | CC BY-SA 4.0 | [`hyg-database-CC-BY-SA-4.0.txt`](./hyg-database-CC-BY-SA-4.0.txt) |
| `data/constellations.json`, `public/data/constellations.json` | [Stellarium](https://github.com/Stellarium/stellarium) `skycultures/modern/constellationship.fab` + `constellation_names.eng.fab` (tag `v1.2`) — a factual line-segment/name table, reformatted by `scripts/build-constellations.ts` | GPL-2 | [`stellarium-GPL-2.txt`](./stellarium-GPL-2.txt) |
| `public/data/mw.json` | [d3-celestial](https://github.com/ofrohn/d3-celestial) `data/mw.json` (Olaf Frohn) — copied verbatim by `scripts/build-milkyway.ts` | BSD-3-Clause | [`d3-celestial-BSD-3.txt`](./d3-celestial-BSD-3.txt) |

Note on `data/stars.json`: because HYG v4.1 is CC BY-SA 4.0 (**not** public
domain — the prompt that first specified this data source assumed public
domain, which turned out to be wrong; corrected here and in the About
panel), our filtered derivative of it is itself subject to CC BY-SA 4.0's
attribution and share-alike terms. It's distributed here under those same
terms; this does not extend to the rest of the repository (the application
code), which stays MIT.

`astronomy-engine` (MIT) is a code dependency, not a redistributed data
file, and is licensed normally via `node_modules`/npm - its license text is
included here anyway for completeness:
[`astronomy-engine-MIT.txt`](./astronomy-engine-MIT.txt).
