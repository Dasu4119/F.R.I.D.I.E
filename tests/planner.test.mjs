import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true } });
after(async () => vite.close());

test("decomposes a software and UI goal into dependency-aware specialist tasks", async () => {
  const { buildPlan } = await vite.ssrLoadModule("/lib/fridie/planner.ts");
  const plan = buildPlan("Build an accessible UI and MongoDB API for F.R.I.D.I.E.", new Date("2026-08-30T00:00:00.000Z"));
  const owners = new Set(plan.tasks.map((task) => task.owner));
  assert.equal(plan.status, "planned");
  assert.match(plan.traceId, /^fri-20260830-[a-f0-9]{8}$/);
  for (const owner of ["planning", "design", "coding", "testing", "verification"]) assert.ok(owners.has(owner));
  assert.equal(plan.tasks.at(-1).owner, "verification");
  assert.deepEqual(plan.tasks.map((task) => task.sequence), [1, 2, 3, 4, 5]);
  assert.ok(plan.tasks.slice(1).every((task) => task.dependsOn.length > 0));
});

test("rejects missing, short, and oversized goals", async () => {
  const { validateGoal } = await vite.ssrLoadModule("/lib/fridie/planner.ts");
  assert.throws(() => validateGoal(undefined), /must be text/);
  assert.throws(() => validateGoal("short"), /at least 8/);
  assert.throws(() => validateGoal("x".repeat(4_001)), /4,000/);
});
