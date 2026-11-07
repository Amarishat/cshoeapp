#!/usr/bin/env node
/**
 * Visual baseline for the 3D shoe, for the model optimisation.
 *
 *   npm run dev -- -p 3200          (in another terminal)
 *   node scripts/shoe-baseline.mjs [http://localhost:3200] [--model /models/x.glb]
 *                                  [--against shoe-baseline] [--out dir]
 *                                  [--closeups] [--only default,all-parts]
 *
 * Drives /dev/3d-shoe/capture in Chrome (software WebGL, so renders are repeatable) and
 * writes to --out (default shoe-baseline/, or shoe-baseline-compare/ with --against):
 *  - renders/<scenario>/<angle>-<copy>.png  for the default shoe, each customer part in
 *    Magenta on its own, all parts in Magenta, and a mixed design (every part in one of the
 *    customiser's colours, neighbouring parts different); from 3 fixed angles; with both copies of
 *    the shoe drawn (as the app does) and, when the model holds two, only copy A / only B;
 *  - thumbnails/<design>-<copy>.png  the Bag thumbnail (shoeThumbnail) for two designs;
 *  - diffs/…png  where a render differs from the one it is compared with;
 *  - report.json  every comparison.
 * --model renders another model file (default: the customiser's). --against compares every
 * both-copies render and thumbnail with the same one in an earlier run's output. --closeups
 * adds close-up views where textures show at full resolution. --only renders just the named
 * scenarios (default, part-<id>, all-parts); thumbnails are always made.
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const BASE_URL = args.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:3200";
const MODEL = option("--model");
const CLOSE_UPS = args.includes("--closeups");
const ONLY = option("--only")?.split(",");
const root = fileURLToPath(new URL("..", import.meta.url));
const AGAINST = option("--against") && resolve(root, option("--against"));
const OUT = resolve(root, option("--out") ?? (AGAINST ? "shoe-baseline-compare" : "shoe-baseline"));
if (AGAINST && AGAINST === OUT) throw new Error("--out must not be the --against directory.");

/** The customiser's Magenta (customization_colours, 003_seed_catalog.sql). */
const MAGENTA = "#E949ED";

/**
 * Every customer part in one of the customiser's six colours (003_seed_catalog.sql), with
 * neighbouring parts in different colours so any colour crossing a part boundary shows.
 */
const MIXED_DESIGN = {
  vamp: "#599C99", // teal
  "toe-cap": "#FDBA62", // orange
  quarter: "#808080", // grey
  eyestay: "#CD2626", // red
  tongue: "#000000", // black
  laces: MAGENTA,
  swoosh: "#000000", // black
  collar: "#FDBA62", // orange
  "heel-tab": "#599C99", // teal
  midsole: MAGENTA,
  outsole: "#000000", // black
};

async function save(path, dataUrl) {
  const file = join(OUT, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"));
}

/** An earlier run's image, as a data URL. */
async function earlier(path) {
  return `data:image/png;base64,${(await readFile(join(AGAINST, path))).toString("base64")}`;
}

const browser = await chromium.launch({
  channel: "chrome",
  // Software WebGL: the same pixels on every run and machine, independent of the GPU.
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on("pageerror", (error) => console.error("Page error:", error.message));
page.setDefaultTimeout(600_000);

const query = new URLSearchParams({ ...(MODEL && { model: MODEL }), ...(CLOSE_UPS && { closeups: "1" }) });
const url = `${BASE_URL}/dev/3d-shoe/capture${query.size ? `?${query}` : ""}`;
console.log(`Loading ${url} …`);
await page.goto(url);
await page.waitForSelector('[data-capture-ready="true"]', { timeout: 600_000 });

const { model, copies, parts, angles, renderer } = await page.evaluate(() => {
  const gl = document.createElement("canvas").getContext("webgl2");
  const info = gl?.getExtension("WEBGL_debug_renderer_info");
  const api = window.__shoeCapture;
  return {
    model: api.model,
    copies: api.copies,
    parts: api.parts,
    angles: api.angles,
    renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown",
  };
});
console.log(`Model: ${model} (copies: ${copies.join(", ")})\nWebGL: ${renderer}`);
console.log(`Parts (${parts.length}): ${parts.join(", ")}\nAngles: ${angles.join(", ")}`);
if (MODEL && model !== MODEL) throw new Error(`Asked for ${MODEL}, but the page loaded ${model}.`);

/** Draw both copies (as the app does), and each copy alone when the model holds two. */
const variants = copies.length > 1 ? ["both", ...copies] : ["both"];

const render = (copy, angle, hexByPart) =>
  page.evaluate((options) => window.__shoeCapture.render(options), { copy, angle, hexByPart });
const thumbnail = (copy, hexByPart) =>
  page.evaluate((options) => window.__shoeCapture.thumbnail(options), { copy, hexByPart });
const diff = (a, b) => page.evaluate(([x, y]) => window.__shoeCapture.diff(x, y), [a, b]);
/** A diff result without its image, for the report. */
const stats = (result) => Object.fromEntries(Object.entries(result).filter(([key]) => key !== "image"));
const px = (n) => String(n).padStart(6);

/** Compares `image` with `other`, saving a diff image under `diffPath` if they differ. */
async function compare(image, other, diffPath) {
  const result = await diff(image, other);
  if (result.changed > 0) await save(diffPath, result.image);
  return stats(result);
}

await rm(OUT, { recursive: true, force: true });

const scenarios = [
  { name: "default", hexByPart: {} },
  ...parts.map((part) => ({ name: `part-${part}`, part, hexByPart: { [part]: MAGENTA } })),
  { name: "all-parts", hexByPart: Object.fromEntries(parts.map((part) => [part, MAGENTA])) },
  { name: "mixed", hexByPart: Object.fromEntries(parts.map((part) => [part, MIXED_DESIGN[part]])) },
].filter((scenario) => !ONLY || ONLY.includes(scenario.name));
if (!scenarios.some((s) => s.name === "default")) throw new Error("--only must include default.");
if (scenarios.some((s) => Object.values(s.hexByPart).some((hex) => !hex))) throw new Error("A scenario has a part with no colour.");

const report = { model, copies, against: AGAINST ?? null, webgl: renderer, magenta: MAGENTA, angles, control: null, renders: [], parts: [], thumbnails: [] };

// Control: the same render twice must match exactly, or no comparison below means anything.
report.control = stats(await diff(await render("both", 0, {}), await render("both", 0, {})));
console.log(`Control (same render twice): ${report.control.changed} pixels differ`);

/** Renders per scenario → angle → copy, kept for the per-part checks. */
const images = {};
for (const scenario of scenarios) {
  images[scenario.name] = [];
  for (let angle = 0; angle < angles.length; angle++) {
    const byCopy = {};
    for (const copy of variants) {
      byCopy[copy] = await render(copy, angle, scenario.hexByPart);
      await save(`renders/${scenario.name}/${angles[angle]}-${copy}.png`, byCopy[copy]);
    }
    images[scenario.name].push(byCopy);
    const name = `${scenario.name}/${angles[angle]}`;
    const row = { scenario: scenario.name, angle: angles[angle] };
    let line = `${scenario.name.padEnd(18)} ${angles[angle].padEnd(18)}`;
    for (const copy of variants.filter((c) => c !== "both")) {
      row[`bothVs${copy}`] = await compare(byCopy.both, byCopy[copy], `diffs/${name}-both-vs-${copy}.png`);
      line += ` both≠${copy}: ${px(row[`bothVs${copy}`].changed)} px`;
    }
    if (AGAINST) {
      const before = await earlier(`renders/${name}-both.png`);
      row.vsBaseline = await compare(byCopy.both, before, `diffs/${name}-vs-baseline.png`);
      line += ` ≠baseline: ${px(row.vsBaseline.changed)} px, >16: ${px(row.vsBaseline.changedOver16)}, max Δ ${row.vsBaseline.maxDelta}, mean Δ ${row.vsBaseline.meanDeltaOfChanged}`;
    }
    report.renders.push(row);
    console.log(line);
  }
}

// Each part: colouring it must change the picture from the default, in every variant.
for (const scenario of scenarios.filter((s) => s.part)) {
  const row = { part: scenario.part };
  for (const copy of variants) {
    let changed = 0;
    for (let angle = 0; angle < angles.length; angle++) {
      changed += (await diff(images.default[angle][copy], images[scenario.name][angle][copy])).changedOver8;
    }
    row[copy] = changed;
  }
  report.parts.push(row);
}
console.log("Pixels changed (> 8 levels) by colouring each part, summed over the angles:");
console.table(report.parts);

// The Bag's thumbnail: one design leaving most leather uncoloured (so the copy shows), and all parts.
const designs = [
  { name: "mixed", hexByPart: { swoosh: MAGENTA, laces: "#FDBA62", "toe-cap": "#599C99", outsole: "#000000" } },
  { name: "all-magenta", hexByPart: Object.fromEntries(parts.map((part) => [part, MAGENTA])) },
];
for (const design of designs) {
  const byCopy = {};
  for (const copy of variants) {
    byCopy[copy] = await thumbnail(copy, design.hexByPart);
    await save(`thumbnails/${design.name}-${copy}.png`, byCopy[copy]);
  }
  const row = { design: design.name, hexByPart: design.hexByPart };
  let line = `thumbnail ${design.name.padEnd(12)}`;
  for (const copy of variants.filter((c) => c !== "both")) {
    row[`bothVs${copy}`] = await compare(byCopy.both, byCopy[copy], `diffs/thumbnail-${design.name}-both-vs-${copy}.png`);
    line += ` both≠${copy}: ${row[`bothVs${copy}`].changed} px`;
  }
  if (AGAINST) {
    const before = await earlier(`thumbnails/${design.name}-both.png`);
    row.vsBaseline = await compare(byCopy.both, before, `diffs/thumbnail-${design.name}-vs-baseline.png`);
    line += ` ≠baseline: ${row.vsBaseline.changed} px, >16: ${row.vsBaseline.changedOver16}, max Δ ${row.vsBaseline.maxDelta}, mean Δ ${row.vsBaseline.meanDeltaOfChanged}`;
  }
  report.thumbnails.push(row);
  console.log(line);
}

await writeFile(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(`\nWrote ${OUT}`);
