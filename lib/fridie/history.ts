import type { RunHistoryRecord } from "@/lib/fridie/types";

export const HISTORY_STORAGE_KEY = "fridie.approved-runs.v1";
export const HISTORY_LIMIT = 10;

function isRunHistoryRecord(value: unknown): value is RunHistoryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<RunHistoryRecord>;
  return (
    typeof record.traceId === "string" &&
    /^fri-\d{8}-\d{8}$/.test(record.traceId) &&
    typeof record.objective === "string" &&
    record.objective.trim().length > 0 &&
    typeof record.taskCount === "number" &&
    Number.isInteger(record.taskCount) &&
    record.taskCount >= 1 &&
    record.taskCount <= 8 &&
    typeof record.confidence === "number" &&
    Number.isFinite(record.confidence) &&
    record.confidence >= 0 &&
    record.confidence <= 1 &&
    typeof record.approvedAt === "string" &&
    Number.isFinite(Date.parse(record.approvedAt))
  );
}

export function parseRunHistory(serialized: string | null): RunHistoryRecord[] {
  if (!serialized) return [];
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.filter(isRunHistoryRecord).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function addApprovedRun(
  history: RunHistoryRecord[],
  approved: RunHistoryRecord,
): RunHistoryRecord[] {
  return [approved, ...history.filter((item) => item.traceId !== approved.traceId)].slice(
    0,
    HISTORY_LIMIT,
  );
}
