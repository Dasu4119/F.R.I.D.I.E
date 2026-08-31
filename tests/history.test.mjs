import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => vite.close());

test("parses only valid device-history records", async () => {
  const { parseRunHistory } = await vite.ssrLoadModule("/lib/fridie/history.ts");
  const result = parseRunHistory(JSON.stringify([
    {
      traceId: "fri-20260830-12345678",
      objective: "Build the approval gate",
      taskCount: 4,
      confidence: 0.84,
      approvedAt: "2026-08-30T18:00:00.000Z",
    },
    { traceId: "bad", objective: "", taskCount: -1 },
  ]));

  assert.equal(result.length, 1);
  assert.equal(result[0].traceId, "fri-20260830-12345678");
});

test("prepends, de-duplicates, and bounds approved history", async () => {
  const { addApprovedRun } = await vite.ssrLoadModule("/lib/fridie/history.ts");
  const current = Array.from({ length: 12 }, (_, index) => ({
    traceId: `fri-20260830-${String(index).padStart(8, "0")}`,
    objective: `Goal ${index}`,
    taskCount: 3,
    confidence: 0.8,
    approvedAt: "2026-08-30T18:00:00.000Z",
  }));
  const approved = {
    traceId: "fri-20260830-00000003",
    objective: "Updated goal",
    taskCount: 5,
    confidence: 0.91,
    approvedAt: "2026-08-30T19:00:00.000Z",
  };

  const next = addApprovedRun(current, approved);

  assert.equal(next.length, 10);
  assert.deepEqual(next[0], approved);
  assert.equal(next.filter((item) => item.traceId === approved.traceId).length, 1);
});
