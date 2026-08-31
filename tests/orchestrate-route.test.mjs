import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true } });
after(async () => vite.close());

test("POST /api/orchestrate returns the stable public plan contract", async () => {
  const { POST } = await vite.ssrLoadModule("/app/api/orchestrate/route.ts");
  const response = await POST(new Request("http://localhost/api/orchestrate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ goal: "Research and build a secure API." }) }));
  const payload = await response.json();
  assert.equal(response.status, 201);
  assert.equal(payload.data.status, "planned");
  assert.ok(payload.data.tasks.some((task) => task.owner === "research"));
  assert.ok(payload.data.tasks.some((task) => task.owner === "coding"));
});

test("POST /api/orchestrate rejects invalid media types and short goals", async () => {
  const { POST } = await vite.ssrLoadModule("/app/api/orchestrate/route.ts");
  const wrongType = await POST(new Request("http://localhost/api/orchestrate", { method: "POST", body: "goal" }));
  assert.equal(wrongType.status, 415);
  const shortGoal = await POST(new Request("http://localhost/api/orchestrate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ goal: "tiny" }) }));
  assert.equal(shortGoal.status, 422);
});
