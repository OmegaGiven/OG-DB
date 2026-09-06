# OG-DB

Small personal reference databases, each published as a self-contained HTML page (no build step, no framework) plus a machine-readable data file.

Live: **https://omegagiven.github.io/OG-DB/**

## Databases

| Database | What it covers | Page | Data |
|---|---|---|---|
| Wireless Surround Headsets | 18 wireless gaming/spatial headsets — source options (2.4 GHz, Bluetooth, base station, wired), power/battery, spatial-audio engine and where the DSP runs, mic type + quality, sidetone, required software, price | [`/wireless-surround-headsets/`](https://omegagiven.github.io/OG-DB/wireless-surround-headsets/) | [`headsets.json`](wireless-surround-headsets/headsets.json) |

## Conventions

- Each database lives in its own folder with an `index.html` (the interactive view) and a `.json` (the same rows, machine-readable).
- Pages are single-file: inline CSS/JS, fonts from Google Fonts, no other external dependencies. Open the `index.html` directly or serve the folder.
- Prices and specs are point-in-time snapshots — see each page's footer for the compile date and sources. Verify current pricing before buying anything.

## Wireless Surround Headsets — data fields

`name` · `form` (driver/form factor) · `msrp` / `street` (USD) · `w24` (2.4 GHz link) · `bt` / `btSimul` (Bluetooth, and whether it mixes with 2.4 GHz simultaneously) · `wired` · `pwr` / `pwrNum` / `battery` (power) · `spatial` (surround engine) · `micType` / `micTier` / `detach` / `micNote` · `sidetone` (`hardware-dial` or `app-or-console`) · `soft` / `nosoft` · `optical` / `planar` / `anc` · `best` / `extra` (notes)

Every "surround" headphone here is *virtualised* — two drivers plus DSP, never discrete channels. The database's main job is showing **where** that DSP runs (dongle / base station / OS / vendor app), which decides what sources it works with.
