import type { GoalPlan, RunHistoryRecord } from "@/lib/fridie/types";

export const HISTORY_LIMIT = 10;

function isRunHistoryRecord(value: unknown): value is RunHistoryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<RunHistoryRecord>;
  return (
    typeof record.traceId === "string" &&
    /^fri-\d{8}-\d{8}$/.test(record.traceId) &&
    typeof record.projectId === "string" &&
    record.projectId.length > 0 &&
    typeof record.objective === "string" &&
    record.objective.trim().length > 0 &&
    (record.status === "planned" || record.status === "approved") &&
    typeof record.taskCount === "number" &&
    Number.isInteger(record.taskCount) &&
    record.taskCount >= 1 &&
    record.taskCount <= 8 &&
    typeof record.confidence === "number" &&
    Number.isFinite(record.confidence) &&
    record.confidence >= 0 &&
    record.confidence <= 1 &&
    typeof record.createdAt === "string" &&
    Number.isFinite(Date.parse(record.createdAt)) &&
    (record.approvedAt === undefined ||
      record.approvedAt === null ||
      (typeof record.approvedAt === "string" && Number.isFinite(Date.parse(record.approvedAt)))) &&
    (record.planningSource === "deterministic" ||
      record.planningSource === "ollama" ||
      record.planningSource === "deterministic_fallback")
  );
}

export function parseRunHistory(value: unknown): RunHistoryRecord[] {
  if (!value || typeof value !== "object" || !("items" in value)) {
    throw new Error("Run history did not match the service contract.");
  }
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items) || !items.every(isRunHistoryRecord)) {
    throw new Error("Run history did not match the service contract.");
  }
  return items.slice(0, HISTORY_LIMIT);
}

export function upsertRunHistory(
  history: RunHistoryRecord[],
  record: RunHistoryRecord,
): RunHistoryRecord[] {
  return [record, ...history.filter((item) => item.traceId !== record.traceId)].slice(
    0,
    HISTORY_LIMIT,
  );
}

export function historyRecordFromPlan(plan: GoalPlan): RunHistoryRecord {
  if (!plan.projectId) throw new Error("The persisted plan is missing its project identifier.");
  return {
    traceId: plan.traceId,
    projectId: plan.projectId,
    objective: plan.objective,
    status: plan.status,
    taskCount: plan.tasks.length,
    confidence: plan.confidence,
    createdAt: plan.createdAt,
    approvedAt: plan.approvedAt,
    planningSource: "deterministic",
  };
}
