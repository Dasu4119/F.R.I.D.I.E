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
  objective: string;
  taskCount: number;
  confidence: number;
  approvedAt: string;
}
