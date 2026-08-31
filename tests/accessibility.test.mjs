import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("goal composer owns labels, validation, pending, and keyboard semantics", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /<form[^>]*noValidate/);
  assert.match(source, /<label htmlFor="goal">/);
  assert.match(source, /aria-describedby=/);
  assert.match(source, /aria-invalid=/);
  assert.match(source, /resize-none/);
  assert.match(source, /!event\.isComposing/);
  assert.match(source, /disabled=\{isPlanning/);
  assert.doesNotMatch(source, /(?:window\.)?(?:alert|confirm|prompt)\s*\(/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});

test("plan approval is explicit, device-local, and does not imply execution", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, />Approve plan</);
  assert.match(source, /Browser-only · latest 10 approvals/);
  assert.match(source, /It does not run tools or agents/);
  assert.match(source, /Execution remains disabled/);
  assert.match(source, /window\.localStorage\.setItem/);
  assert.match(source, /try\s*\{/);
  assert.match(source, /aria-busy=/);
});

test("model readiness copy separates verified local API behavior from hosted planning", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Verified model planner/);
  assert.match(source, /Local API ready · fallback armed/);
  assert.match(source, /hosted route remains deterministic/i);
  assert.match(source, /fall back to the deterministic planner/);
});

test("global UI includes visible focus, scrollbars, narrow layout, and reduced motion", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /focus-visible/);
  assert.match(css, /scrollbar-color/);
  assert.match(css, /max-width:\s*620px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
});
