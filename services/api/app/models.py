from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

AgentKind = Literal[
    "planning",
    "research",
    "coding",
    "analysis",
    "design",
    "testing",
    "documentation",
    "verification",
]


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class APIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class GoalRequest(APIModel):
    goal: str = Field(min_length=8, max_length=4_000)
    project_id: str | None = Field(default=None, max_length=64)

    @field_validator("goal")
    @classmethod
    def normalize_goal(cls, value: str) -> str:
        return " ".join(value.split())


class AgentTask(APIModel):
    id: str
    sequence: int = Field(ge=1)
    title: str
    owner: AgentKind
    phase: Literal["frame", "investigate", "build", "verify", "deliver"]
    status: Literal["ready", "blocked"]
    depends_on: list[str]
    rationale: str
    acceptance_check: str


class GoalPlan(APIModel):
    trace_id: str
    project_id: str | None = None
    objective: str
    summary: str
    confidence: float = Field(ge=0, le=1)
    status: Literal["planned", "approved"] = "planned"
    tasks: list[AgentTask]
    assumptions: list[str]
    limitations: list[str]
    created_at: datetime
    approved_at: datetime | None = None


DraftText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=4, max_length=500)]


class ModelTaskDraft(APIModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
        extra="forbid",
    )

    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=120)]
    owner: AgentKind
    phase: Literal["frame", "investigate", "build", "verify", "deliver"]
    depends_on: list[int] = Field(max_length=7)
    rationale: DraftText
    acceptance_check: DraftText


class ModelPlanDraft(APIModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
        extra="forbid",
    )

    summary: Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=500)]
    confidence: float = Field(ge=0, le=1)
    tasks: list[ModelTaskDraft] = Field(min_length=3, max_length=8)
    assumptions: list[DraftText] = Field(min_length=1, max_length=4)
    limitations: list[DraftText] = Field(min_length=1, max_length=4)


class VerificationIssue(APIModel):
    code: str
    message: str


class ModelPlanRoute(APIModel):
    provider: Literal["ollama"] = "ollama"
    source: Literal["ollama", "deterministic_fallback"]
    model: str | None = None
    verified: bool
    issues: list[VerificationIssue]
    message: str


class ModelPlanResult(APIModel):
    plan: GoalPlan
    route: ModelPlanRoute


class RunSummary(APIModel):
    trace_id: str
    project_id: str
    objective: str
    status: Literal["planned", "approved"]
    confidence: float = Field(ge=0, le=1)
    task_count: int = Field(ge=1, le=8)
    created_at: datetime
    approved_at: datetime | None = None
    planning_source: Literal["deterministic", "ollama", "deterministic_fallback"] = "deterministic"


class RunListResponse(APIModel):
    items: list[RunSummary]
    count: int = Field(ge=0)


class ModelStatus(APIModel):
    provider: Literal["ollama"] = "ollama"
    configured: bool
    connected: bool
    ready: bool
    model: str | None = None
    available_models: list[str]
    message: str
    checked_at: datetime


class HealthResponse(APIModel):
    status: Literal["ok"]
    service: str
    database: str
