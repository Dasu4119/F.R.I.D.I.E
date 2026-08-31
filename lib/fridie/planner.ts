import type { AgentKind, AgentTask, GoalPlan } from "./types";

const MAX_GOAL_LENGTH = 4_000;

function hasAny(goal: string, terms: string[]) {
  const normalized = goal.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function compactGoal(goal: string) {
  return goal.trim().replace(/\s+/g, " ");
}

function task(
  sequence: number,
  owner: AgentKind,
  phase: AgentTask["phase"],
  title: string,
  rationale: string,
  acceptanceCheck: string,
  dependsOn: string[] = [],
): AgentTask {
  const id = `task-${String(sequence).padStart(2, "0")}`;
  return {
    id,
    sequence,
    title,
    owner,
    phase,
    status: dependsOn.length === 0 ? "ready" : "blocked",
    dependsOn,
    rationale,
    acceptanceCheck,
  };
}

export function validateGoal(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Goal must be text.");
  }
  const goal = compactGoal(input);
  if (goal.length < 8) {
    throw new Error("Describe the goal in at least 8 characters.");
  }
  if (goal.length > MAX_GOAL_LENGTH) {
    throw new Error(`Goal must be ${MAX_GOAL_LENGTH.toLocaleString()} characters or fewer.`);
  }
  return goal;
}

export function buildPlan(input: unknown, now = new Date()): GoalPlan {
  const goal = validateGoal(input);
  const tasks: AgentTask[] = [
    task(
      1,
      "planning",
      "frame",
      "Define the outcome and constraints",
      "A shared definition of done prevents specialist agents from solving different problems.",
      "The outcome, scope boundary, constraints, and required evidence are explicit.",
    ),
  ];

  let sequence = 2;
  if (hasAny(goal, ["research", "market", "compare", "latest", "find", "investigate"])) {
    tasks.push(
      task(
        sequence++,
        "research",
        "investigate",
        "Collect and rank source evidence",
        "The goal depends on external or comparative evidence.",
        "Claims are linked to primary sources and disagreements are surfaced.",
        ["task-01"],
      ),
    );
  }

  if (hasAny(goal, ["design", "ui", "ux", "3d", "blender", "interface", "screen"])) {
    tasks.push(
      task(
        sequence++,
        "design",
        "build",
        "Resolve the interaction and visual system",
        "The requested outcome includes a user-facing or spatial design surface.",
        "The primary flow, states, responsive behavior, and design tokens are testable.",
        ["task-01"],
      ),
    );
  }

  const buildOwner: AgentKind = hasAny(goal, ["code", "build", "software", "app", "api", "database"])
    ? "coding"
    : "analysis";
  tasks.push(
    task(
      sequence++,
      buildOwner,
      "build",
      buildOwner === "coding" ? "Implement the smallest working slice" : "Develop and compare solution paths",
      "A concrete artifact or decision is required before verification can begin.",
      buildOwner === "coding"
        ? "The public workflow runs through its real boundary and handles failure safely."
        : "Alternatives are compared against the stated constraints with a recommended path.",
      ["task-01"],
    ),
  );

  tasks.push(
    task(
      sequence++,
      "testing",
      "verify",
      "Challenge the result against acceptance checks",
      "Independent verification catches incomplete work and unsupported claims.",
      "Happy path, boundary cases, and the highest-risk failure path have fresh evidence.",
      tasks.filter((item) => item.phase === "build").map((item) => item.id),
    ),
  );
  tasks.push(
    task(
      sequence++,
      "verification",
      "deliver",
      "Reconcile evidence and prepare the handoff",
      "The user needs one coherent result rather than disconnected specialist outputs.",
      "Every acceptance criterion is confirmed, partial, unverified, or failed with evidence.",
      [tasks[tasks.length - 1].id],
    ),
  );

  const traceSeed = `${now.toISOString()}-${goal}`;
  let hash = 2166136261;
  for (const char of traceSeed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const traceId = `fri-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${(hash >>> 0)
    .toString(16)
    .padStart(8, "0")}`;

  return {
    traceId,
    objective: goal,
    summary: `${tasks.length} coordinated tasks across ${new Set(tasks.map((item) => item.owner)).size} specialist roles.`,
    confidence: 0.78,
    status: "planned",
    tasks,
    assumptions: [
      "The user wants an executable first slice before broader platform capabilities.",
      "Sensitive actions remain disabled until permissions and sandboxing are configured.",
    ],
    limitations: [
      "This v0.1 planner is deterministic; local LLM and tool adapters are not connected yet.",
      "Task completion still requires an executor and fresh verification evidence.",
    ],
    createdAt: now.toISOString(),
  };
}
