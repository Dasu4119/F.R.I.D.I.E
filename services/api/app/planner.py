from datetime import UTC, datetime
from hashlib import sha256

from .models import AgentTask, GoalPlan


def _has_any(goal: str, terms: list[str]) -> bool:
    normalized = goal.lower()
    return any(term in normalized for term in terms)


def _task(
    sequence: int,
    owner: str,
    phase: str,
    title: str,
    rationale: str,
    acceptance_check: str,
    depends_on: list[str] | None = None,
) -> AgentTask:
    dependencies = depends_on or []
    return AgentTask(
        id=f"task-{sequence:02d}",
        sequence=sequence,
        title=title,
        owner=owner,
        phase=phase,
        status="ready" if not dependencies else "blocked",
        depends_on=dependencies,
        rationale=rationale,
        acceptance_check=acceptance_check,
    )


def create_trace_id(goal: str, created_at: datetime) -> str:
    digest = sha256(f"{created_at.isoformat()}:{goal}".encode()).hexdigest()[:8]
    return f"fri-{created_at:%Y%m%d}-{digest}"


def build_plan(goal: str, *, now: datetime | None = None) -> GoalPlan:
    created_at = now or datetime.now(UTC)
    normalized_goal = " ".join(goal.split())
    if len(normalized_goal) < 8:
        raise ValueError("Describe the goal in at least 8 characters.")

    tasks = [
        _task(
            1,
            "planning",
            "frame",
            "Define the outcome and constraints",
            "A shared definition of done keeps specialist agents aligned.",
            "Outcome, scope, constraints, and required evidence are explicit.",
        )
    ]
    sequence = 2

    if _has_any(normalized_goal, ["research", "market", "compare", "latest", "investigate"]):
        tasks.append(
            _task(
                sequence,
                "research",
                "investigate",
                "Collect and rank source evidence",
                "The goal depends on external or comparative evidence.",
                "Claims cite primary sources and surface disagreements.",
                ["task-01"],
            )
        )
        sequence += 1

    if _has_any(normalized_goal, ["design", "ui", "ux", "3d", "blender", "interface"]):
        tasks.append(
            _task(
                sequence,
                "design",
                "build",
                "Resolve the interaction and visual system",
                "The outcome includes a user-facing or spatial design surface.",
                "The primary flow, states, responsive behavior, and tokens are testable.",
                ["task-01"],
            )
        )
        sequence += 1

    build_owner = (
        "coding"
        if _has_any(normalized_goal, ["code", "build", "software", "app", "api", "database"])
        else "analysis"
    )
    tasks.append(
        _task(
            sequence,
            build_owner,
            "build",
            "Implement the smallest working slice"
            if build_owner == "coding"
            else "Develop and compare solution paths",
            "A concrete artifact or decision is required before verification.",
            "The workflow runs through its real boundary and handles failure safely."
            if build_owner == "coding"
            else "Alternatives are compared against constraints with a recommendation.",
            ["task-01"],
        )
    )
    sequence += 1
    build_ids = [task.id for task in tasks if task.phase == "build"]
    tasks.append(
        _task(
            sequence,
            "testing",
            "verify",
            "Challenge the result against acceptance checks",
            "Independent verification catches incomplete work and unsupported claims.",
            "Happy path, boundaries, and the highest-risk failure have fresh evidence.",
            build_ids,
        )
    )
    sequence += 1
    tasks.append(
        _task(
            sequence,
            "verification",
            "deliver",
            "Reconcile evidence and prepare the handoff",
            "The user needs one coherent result rather than disconnected outputs.",
            "Every acceptance criterion has an evidence-backed status.",
            [tasks[-1].id],
        )
    )

    return GoalPlan(
        trace_id=create_trace_id(normalized_goal, created_at),
        objective=normalized_goal,
        summary=(
            f"{len(tasks)} coordinated tasks across "
            f"{len({task.owner for task in tasks})} specialist roles."
        ),
        confidence=0.78,
        tasks=tasks,
        assumptions=[
            "The user wants an executable first slice before broader platform capabilities.",
            "Sensitive actions remain disabled until permissions and sandboxing are configured.",
        ],
        limitations=[
            "The v0.1 planner is deterministic; local LLM and tool adapters are not connected yet.",
            "Task completion requires an executor and fresh verification evidence.",
        ],
        created_at=created_at,
    )
