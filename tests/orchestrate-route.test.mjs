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

const user = {
  id: "site-owner-123",
  displayName: "Owner",
  email: "owner@example.com",
  fullName: "Owner",
};

test("POST /api/orchestrate requires an authenticated Sites user", async () => {
  const { createOrchestrationPost } = await vite.ssrLoadModule("/app/api/orchestrate/route.ts");
  const POST = createOrchestrationPost({
    getUser: async () => null,
    requestApi: async () => {
      throw new Error("The backend must not be called without a user.");
    },
  });
  const response = await POST(new Request("http://localhost/api/orchestrate", { method: "POST" }));

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "authentication_required");
});

test("POST /api/orchestrate validates input and passes identity only to the server client", async () => {
  const { createOrchestrationPost } = await vite.ssrLoadModule("/app/api/orchestrate/route.ts");
  let forwarded;
  const POST = createOrchestrationPost({
    getUser: async () => user,
    requestApi: async (input) => {
      forwarded = input;
      return Response.json({ data: { status: "planned" } }, { status: 201 });
    },
  });
  const response = await POST(new Request("http://localhost/api/orchestrate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ goal: "  Research and build a secure API.  " }),
  }));

  assert.equal(response.status, 201);
  assert.deepEqual(forwarded, {
    body: { goal: "Research and build a secure API." },
    method: "POST",
    path: "/api/v1/goals",
    userEmail: "owner@example.com",
  });
  assert.equal(forwarded.body.email, undefined);
});

test("POST /api/orchestrate rejects invalid media types and short goals before persistence", async () => {
  const { createOrchestrationPost } = await vite.ssrLoadModule("/app/api/orchestrate/route.ts");
  const POST = createOrchestrationPost({
    getUser: async () => user,
    requestApi: async () => {
      throw new Error("Invalid requests must not reach the backend.");
    },
  });
  const wrongType = await POST(new Request("http://localhost/api/orchestrate", {
    method: "POST",
    body: "goal",
  }));
  assert.equal(wrongType.status, 415);
  const shortGoal = await POST(new Request("http://localhost/api/orchestrate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ goal: "tiny" }),
  }));
  assert.equal(shortGoal.status, 422);
});

test("GET /api/runs validates the bound and forwards owner scope", async () => {
  const { createRunsGet } = await vite.ssrLoadModule("/app/api/runs/route.ts");
  let forwarded;
  const GET = createRunsGet({
    getUser: async () => user,
    requestApi: async (input) => {
      forwarded = input;
      return Response.json({ data: { items: [], count: 0 } });
    },
  });

  const response = await GET(new Request("http://localhost/api/runs?limit=10"));
  assert.equal(response.status, 200);
  assert.equal(forwarded.path, "/api/v1/runs?limit=10");
  assert.equal(forwarded.userEmail, user.email);

  const invalid = await GET(new Request("http://localhost/api/runs?limit=all"));
  assert.equal(invalid.status, 400);
});

test("POST /api/runs/:trace/approve rejects invalid traces and forwards valid approval", async () => {
  const { createApprovalPost } = await vite.ssrLoadModule(
    "/app/api/runs/[traceId]/approve/route.ts",
  );
  let forwarded;
  const POST = createApprovalPost({
    getUser: async () => user,
    requestApi: async (input) => {
      forwarded = input;
      return Response.json({ data: { status: "approved" } });
    },
  });

  const invalid = await POST(new Request("http://localhost/api/runs/bad/approve"), {
    params: Promise.resolve({ traceId: "bad" }),
  });
  assert.equal(invalid.status, 400);

  const response = await POST(
    new Request("http://localhost/api/runs/fri-20260902-12345678/approve"),
    { params: Promise.resolve({ traceId: "fri-20260902-12345678" }) },
  );
  assert.equal(response.status, 200);
  assert.equal(forwarded.path, "/api/v1/runs/fri-20260902-12345678/approve");
  assert.equal(forwarded.userEmail, user.email);
});

test("server API client keeps the service token out of its browser-facing response", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.FRIDIE_API_BASE_URL;
  const originalToken = process.env.FRIDIE_API_SERVICE_TOKEN;
  let forwardedHeaders;

  process.env.FRIDIE_API_BASE_URL = "https://fridie.fastapicloud.dev";
  process.env.FRIDIE_API_SERVICE_TOKEN = "test-secret-service-token";
  globalThis.fetch = async (_url, init) => {
    forwardedHeaders = init.headers;
    return Response.json({ items: [], count: 0 });
  };

  try {
    const { requestFridieApi } = await vite.ssrLoadModule("/lib/fridie/server-api.ts");
    const response = await requestFridieApi({
      method: "GET",
      path: "/api/v1/runs?limit=10",
      userEmail: user.email,
    });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(forwardedHeaders.Authorization, "Bearer test-secret-service-token");
    assert.match(forwardedHeaders["X-FRIDIE-User"], /^usr_[a-f0-9]{64}$/);
    assert.notEqual(forwardedHeaders["X-FRIDIE-User"], user.email);
    assert.doesNotMatch(body, /test-secret-service-token/);
    assert.doesNotMatch(body, /owner@example\.com/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.FRIDIE_API_BASE_URL;
    else process.env.FRIDIE_API_BASE_URL = originalBaseUrl;
    if (originalToken === undefined) delete process.env.FRIDIE_API_SERVICE_TOKEN;
    else process.env.FRIDIE_API_SERVICE_TOKEN = originalToken;
  }
});
