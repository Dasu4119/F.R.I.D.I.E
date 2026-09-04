import { getChatGPTUser } from "@/app/chatgpt-auth";
import { requestFridieApi } from "@/lib/fridie/server-api";

export const dynamic = "force-dynamic";

type RunListDependencies = {
  getUser: typeof getChatGPTUser;
  requestApi: typeof requestFridieApi;
};

const defaultDependencies: RunListDependencies = {
  getUser: getChatGPTUser,
  requestApi: requestFridieApi,
};

export function createRunsGet(dependencies = defaultDependencies) {
  return async function get(request: Request) {
    const user = await dependencies.getUser();
    if (!user) {
      return Response.json(
        { error: { code: "authentication_required", message: "Sign in to view run history." } },
        { status: 401 },
      );
    }

    const rawLimit = new URL(request.url).searchParams.get("limit") ?? "10";
    const limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return Response.json(
        { error: { code: "invalid_limit", message: "Limit must be an integer from 1 to 100." } },
        { status: 400 },
      );
    }

    return dependencies.requestApi({
      method: "GET",
      path: `/api/v1/runs?limit=${limit}`,
      userEmail: user.email,
    });
  };
}

export const GET = createRunsGet();
