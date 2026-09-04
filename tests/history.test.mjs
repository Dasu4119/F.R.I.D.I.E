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

test("parses valid server-history records and rejects contract drift", async () => {
  const { parseRunHistory } = await vite.ssrLoadModule("/lib/fridie/history.ts");
  const result = parseRunHistory({ items: [
    {
      traceId: "fri-20260830-12345678",
      projectId: "project-1",
      objective: "Build the approval gate",
      status: "approved",
      taskCount: 4,
      confidence: 0.84,
      createdAt: "2026-08-30T17:00:00.000Z",
      approvedAt: "2026-08-30T18:00:00.000Z",
      planningSource: "deterministic",
    },
  ] });

  assert.equal(result.length, 1);
  assert.equal(result[0].traceId, "fri-20260830-12345678");
  assert.throws(
    () => parseRunHistory({ items: [{ traceId: "bad", objective: "", taskCount: -1 }] }),
    /service contract/,
  );
});

test("prepends, de-duplicates, and bounds persistent history", async () => {
  const { upsertRunHistory } = await vite.ssrLoadModule("/lib/fridie/history.ts");
  const current = Array.from({ length: 12 }, (_, index) => ({
    traceId: `fri-20260830-${String(index).padStart(8, "0")}`,
    projectId: `project-${index}`,
    objective: `Goal ${index}`,
    status: "planned",
    taskCount: 3,
    confidence: 0.8,
    createdAt: "2026-08-30T18:00:00.000Z",
    planningSource: "deterministic",
  }));
  const approved = {
    traceId: "fri-20260830-00000003",
    projectId: "project-3",
    objective: "Updated goal",
    status: "approved",
    taskCount: 5,
    confidence: 0.91,
    createdAt: "2026-08-30T18:00:00.000Z",
    approvedAt: "2026-08-30T19:00:00.000Z",
    planningSource: "deterministic",
  };

  const next = upsertRunHistory(current, approved);

  assert.equal(next.length, 10);
  assert.deepEqual(next[0], approved);
  assert.equal(next.filter((item) => item.traceId === approved.traceId).length, 1);
});
