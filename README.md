# OG-DB

Small personal reference databases, each published as a self-contained HTML page (no build step, no framework) plus a machine-readable data file.

Live: **https://omegagiven.github.io/OG-DB/**

## Databases

| Database | What it covers | Page | Data |
|---|---|---|---|
| Headset DB | Wireless gaming / spatial headsets — connection, power, charge port, spatial-audio engine + where the DSP runs, mic type & quality, sidetone, per-OS software, standalone-vs-app, price. | [`/headsets/`](https://omegagiven.github.io/OG-DB/headsets/) | [`headsets.json`](headsets/headsets.json) |
| Split Keyboard DB | Split ergonomic keyboards, commercial + DIY kits — split type, layout, key count, switches, keycaps, connection, firmware, tenting, pointing device, assembly, price. | [`/keyboards/`](https://omegagiven.github.io/OG-DB/keyboards/) | [`keyboards.json`](keyboards/keyboards.json) |
| Phone DB | Smartphones 2022&ndash;2026, mainstream + enthusiast &mdash; SoC, memory, display, battery/charging, USB spec, headphone jack, microSD, IR blaster, water resistance, full camera set, OS update years, bootloader / custom-ROM support, launch price. | [`/phones/`](https://omegagiven.github.io/OG-DB/phones/) | [`phones.json`](phones/phones.json) |
| Local AI DB | Open-weight / locally-runnable models &mdash; VRAM by quant (Q4/Q8/FP16), max context + real-world context note, KV-cache cost, image recognition, audio recognition, reasoning &amp; coding tier, tool use, runner support, license. | [`/localai/`](https://omegagiven.github.io/OG-DB/localai/) | [`localai.json`](localai/localai.json) |
| Mouse DB | PC & gaming mice — side-button count, multi-device switching, scroll-wheel type (ratchet / free-spin / toggle), tilt, sensor, DPI/polling, weight, onboard memory, software, price. | [`/mice/`](https://omegagiven.github.io/OG-DB/mice/) | [`mice.json`](mice/mice.json) |

## Requests

Want a row added, a value corrected, a database refreshed, or a whole new
database for another product line? [Open an issue](https://github.com/OmegaGiven/OG-DB/issues/new/choose)
— there are templates for each. Existing requests: [issues](https://github.com/OmegaGiven/OG-DB/issues).

## Conventions

- Each database lives in its own folder with an `index.html` (the interactive view) and a `.json` (the same rows, machine-readable).
- Pages are single-file: inline CSS/JS, fonts from Google Fonts, no other external dependencies. Open the `index.html` directly or serve the folder.
- Newer databases are generated from `gen/` — `gen/build.js <slug>` stitches `gen/shell.css` + `gen/engine.js` + `gen/db/<slug>.defs.js` + `gen/db/<slug>.meta.json` + the data file into the page. The Headset DB predates this and is hand-maintained.
- Prices and specs are point-in-time snapshots — see each page's footer for the compile date and sources. Verify current pricing before buying anything.
- Every DB page: filterable + sortable table, a Columns button to show/hide columns (remembered per browser), click a row to expand full detail, per-row Source link.
