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

test("plan approval is explicit, durable, and does not imply execution", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /"Approve plan"/);
  assert.match(source, /MongoDB Atlas · latest 10 runs/);
  assert.match(source, /It does not run tools or agents/);
  assert.match(source, /Execution remains disabled/);
  assert.match(source, /\/api\/runs\/\$\{encodeURIComponent\(plan\.traceId\)\}\/approve/);
  assert.doesNotMatch(source, /localStorage/);
  assert.match(source, /try\s*\{/);
  assert.match(source, /aria-busy=/);
});

test("readiness copy explains authenticated persistence and disabled execution", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Protected API boundary/);
  assert.match(source, /MongoDB Atlas FRIDIE/);
  assert.match(source, /No credential in the browser/);
  assert.match(source, /code execution stay off/);
});

test("persistent history includes loading, error recovery, and empty states", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Loading persistent history/);
  assert.match(source, /History is temporarily unavailable/);
  assert.match(source, /No persistent plans yet/);
  assert.match(source, /onClick=\{\(\) => void loadHistory\(\)\}/);
});

test("global UI includes visible focus, scrollbars, narrow layout, and reduced motion", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /focus-visible/);
  assert.match(css, /scrollbar-color/);
  assert.match(css, /max-width:\s*620px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
});
