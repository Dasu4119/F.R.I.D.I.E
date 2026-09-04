export type AgentKind =
  | "planning"
  | "research"
  | "coding"
  | "analysis"
  | "design"
  | "testing"
  | "documentation"
  | "verification";

export type TaskStatus = "ready" | "blocked";

export interface AgentTask {
  id: string;
  sequence: number;
  title: string;
  owner: AgentKind;
  phase: "frame" | "investigate" | "build" | "verify" | "deliver";
  status: TaskStatus;
  dependsOn: string[];
  rationale: string;
  acceptanceCheck: string;
}

export interface GoalPlan {
  traceId: string;
  projectId?: string;
  objective: string;
  summary: string;
  confidence: number;
  status: "planned" | "approved";
  tasks: AgentTask[];
  assumptions: string[];
  limitations: string[];
  createdAt: string;
  approvedAt?: string;
}

export interface RunHistoryRecord {
  traceId: string;
  projectId: string;
  objective: string;
  status: "planned" | "approved";
  taskCount: number;
  confidence: number;
  createdAt: string;
  approvedAt?: string | null;
  planningSource: "deterministic" | "ollama" | "deterministic_fallback";
}
