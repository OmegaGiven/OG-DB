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
| Laptop DB | Laptops 2023&ndash;2026 in five price bands (&lt;$500 &rarr; $2000+) &mdash; MacBooks, Framework, Dell, HP, Lenovo, ASUS, Razer, MSI. CPU/GPU options, RAM &amp; storage upgradeability, display, weight, battery, ports, Linux support, repairability, start price. | [`/laptops/`](https://omegagiven.github.io/OG-DB/laptops/) | [`laptops.json`](laptops/laptops.json) |
| GPU DB | GPUs for local AI + gaming, price-tracked &mdash; VRAM, largest model at Q4 / FP16, tensor compute, TDP + connector, res target, Cyberpunk FPS at 1080p / 1440p / 4K / 4K+RT. | [`/gpus/`](https://omegagiven.github.io/OG-DB/gpus/) | [`gpus.json`](gpus/gpus.json) |
| SSD DB | NVMe + SATA SSDs, price-tracked &mdash; capacity, PCIe gen, DRAM, NAND, controller, speeds, endurance, $/TB. | [`/ssds/`](https://omegagiven.github.io/OG-DB/ssds/) | [`ssds.json`](ssds/ssds.json) |
| RAM DB | DDR4 / DDR5 kits, price-tracked &mdash; capacity, speed, CL, EXPO/XMP, rank, IC die, height, $/GB. | [`/ram/`](https://omegagiven.github.io/OG-DB/ram/) | [`ram.json`](ram/ram.json) |
| HDD DB | Hard drives, price-tracked &mdash; capacity, CMR/SMR, use case, RPM, workload, warranty, idle power, $/TB. | [`/hdds/`](https://omegagiven.github.io/OG-DB/hdds/) | [`hdds.json`](hdds/hdds.json) |
| Robot Vacuum | Robot vacuums &mdash; cleaning ability (suction, pickup %), mop + dock features, LiDAR vs camera navigation, cloud dependence + privacy risk, local control (Valetudo / Matter / Home Assistant), warranty, price. | [`/vacuums/`](https://omegagiven.github.io/OG-DB/vacuums/) | [`vacuums.json`](vacuums/vacuums.json) |
| 3D Printer | FDM + resin printers &mdash; build volume and $/L, hotend / extruder, multi-colour mechanism (toolchanger / dual nozzle / multi-spool feeder / MMU) with max colours and purge waste, enclosure + heated chamber, speed, bed, levelling, camera / AI, firmware openness, cloud vs LAN, assembly, materials, price. | [`/printers/`](https://omegagiven.github.io/OG-DB/printers/) | [`printers.json`](printers/printers.json) |
| Mouse DB | PC & gaming mice — side-button count, multi-device switching, scroll-wheel type (ratchet / free-spin / toggle), tilt, sensor, DPI/polling, weight, onboard memory, software, price. | [`/mice/`](https://omegagiven.github.io/OG-DB/mice/) | [`mice.json`](mice/mice.json) |

## Requests

Want a row added, a value corrected, a database refreshed, or a whole new
database for another product line? [Open an issue](https://github.com/OmegaGiven/OG-DB/issues/new/choose)
— there are templates for each. Existing requests: [issues](https://github.com/OmegaGiven/OG-DB/issues).

## Price tracking

GPU, SSD, RAM and HDD rows carry `priceHistory: [{date, priceUSD, source}]`. Pages render a sparkline in the price column and a full chart in the expanded row. Append a snapshot with `node gen/snapshot.js <slug> prices.json` (a `{name: price}` map or `[{name, priceUSD, source}]`); it updates `priceUSD`, `$/TB` or `$/GB`, and rebuilds the page. A weekly routine appends new points; ad-hoc refreshes on request.

## Conventions

- Each database lives in its own folder with an `index.html` (the interactive view) and a `.json` (the same rows, machine-readable).
- Pages are single-file: inline CSS/JS, fonts from Google Fonts, no other external dependencies. Open the `index.html` directly or serve the folder.
- Newer databases are generated from `gen/` — `gen/build.js <slug>` stitches `gen/shell.css` + `gen/engine.js` + `gen/db/<slug>.defs.js` + `gen/db/<slug>.meta.json` + the data file into the page. The Headset DB predates this and is hand-maintained.
- Prices and specs are point-in-time snapshots — see each page's footer for the compile date and sources. Verify current pricing before buying anything.
- Every DB page: filterable + sortable table, a Columns button to show/hide columns (remembered per browser), click a row to expand full detail, per-row Source link.
