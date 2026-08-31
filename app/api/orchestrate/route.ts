import { buildPlan, validateGoal } from "@/lib/fridie/planner";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
    return Response.json({ data: buildPlan(goal) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The goal could not be planned.";
    const status = error instanceof SyntaxError ? 400 : 422;
    return Response.json({ error: { code: "invalid_goal", message } }, { status });
  }
}
