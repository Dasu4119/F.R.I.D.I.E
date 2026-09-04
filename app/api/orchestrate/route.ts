import { getChatGPTUser } from "@/app/chatgpt-auth";
import { validateGoal } from "@/lib/fridie/planner";
import { requestFridieApi } from "@/lib/fridie/server-api";

export const dynamic = "force-dynamic";

type OrchestrationDependencies = {
  getUser: typeof getChatGPTUser;
  requestApi: typeof requestFridieApi;
};

const defaultDependencies: OrchestrationDependencies = {
  getUser: getChatGPTUser,
  requestApi: requestFridieApi,
};

export function createOrchestrationPost(dependencies = defaultDependencies) {
  return async function post(request: Request) {
    const user = await dependencies.getUser();
    if (!user) {
      return Response.json(
        { error: { code: "authentication_required", message: "Sign in to create a plan." } },
        { status: 401 },
      );
    }

    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        return Response.json(
          { error: { code: "unsupported_media_type", message: "Send the goal as JSON." } },
          { status: 415 },
        );
      }
      const body = (await request.json()) as { goal?: unknown };
      const goal = validateGoal(body.goal);
      return dependencies.requestApi({
        body: { goal },
        method: "POST",
        path: "/api/v1/goals",
        userEmail: user.email,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The goal could not be planned.";
      const status = error instanceof SyntaxError ? 400 : 422;
      return Response.json({ error: { code: "invalid_goal", message } }, { status });
    }
  };
}

export const POST = createOrchestrationPost();
