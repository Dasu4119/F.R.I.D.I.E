import { getChatGPTUser } from "@/app/chatgpt-auth";
import { requestFridieApi } from "@/lib/fridie/server-api";

export const dynamic = "force-dynamic";

type ApprovalDependencies = {
  getUser: typeof getChatGPTUser;
  requestApi: typeof requestFridieApi;
};

type ApprovalContext = {
  params: Promise<{ traceId: string }>;
};

const defaultDependencies: ApprovalDependencies = {
  getUser: getChatGPTUser,
  requestApi: requestFridieApi,
};

export function createApprovalPost(dependencies = defaultDependencies) {
  return async function post(_request: Request, context: ApprovalContext) {
    const user = await dependencies.getUser();
    if (!user) {
      return Response.json(
        { error: { code: "authentication_required", message: "Sign in to approve a plan." } },
        { status: 401 },
      );
    }

    const { traceId } = await context.params;
    if (!/^fri-\d{8}-\d{8}$/.test(traceId)) {
      return Response.json(
        { error: { code: "invalid_trace", message: "The plan trace identifier is invalid." } },
        { status: 400 },
      );
    }

    return dependencies.requestApi({
      method: "POST",
      path: `/api/v1/runs/${traceId}/approve`,
      userId: user.id,
    });
  };
}

export const POST = createApprovalPost();
