import json
from datetime import UTC, datetime

import pytest

from app.model_planner import route_model_plan
from app.ollama import ModelGenerationError


def valid_draft():
    return {
        "summary": "A verified four-stage implementation plan.",
        "confidence": 0.91,
        "tasks": [
            {
                "title": "Frame the requested outcome",
                "owner": "planning",
                "phase": "frame",
                "dependsOn": [],
                "rationale": "A shared definition of done prevents drift.",
                "acceptanceCheck": "Outcome, constraints, and evidence are explicit.",
            },
            {
                "title": "Build the smallest working slice",
                "owner": "coding",
                "phase": "build",
                "dependsOn": [1],
                "rationale": "The goal requires a concrete software artifact.",
                "acceptanceCheck": "The feature runs through its public API boundary.",
            },
            {
                "title": "Challenge the working slice",
                "owner": "testing",
                "phase": "verify",
                "dependsOn": [2],
                "rationale": "Independent checks catch unsafe assumptions.",
                "acceptanceCheck": "Happy path, boundaries, and fallback behavior pass.",
            },
            {
                "title": "Reconcile evidence for handoff",
                "owner": "verification",
                "phase": "deliver",
                "dependsOn": [3],
                "rationale": "The user needs one evidence-backed result.",
                "acceptanceCheck": "Every acceptance criterion has a verified status.",
            },
        ],
        "assumptions": ["The goal can be delivered as one bounded vertical slice."],
        "limitations": ["No tools or generated code are executed by this planning route."],
    }


class FakeAdapter:
    model = "qwen3:8b"

    def __init__(self, response):
        self.response = response
        self.request = None

    async def generate_structured(self, *, prompt, schema, system):
        self.request = {"prompt": prompt, "schema": schema, "system": system}
        if isinstance(self.response, Exception):
            raise self.response
        return self.response


@pytest.mark.asyncio
async def test_valid_model_plan_is_normalized_and_verified():
    adapter = FakeAdapter(valid_draft())

    result = await route_model_plan(
        "Build a secure model planning API.",
        adapter=adapter,
        now=datetime(2026, 8, 30, 19, 0, tzinfo=UTC),
    )

    assert result.route.source == "ollama"
    assert result.route.verified is True
    assert result.route.issues == []
    assert result.plan.trace_id == "fri-20260830-d15c0641"
    assert result.plan.tasks[1].depends_on == ["task-01"]
    assert result.plan.tasks[1].status == "blocked"
    assert result.plan.confidence == 0.82
    assert "Build a secure model planning API." in adapter.request["prompt"]
    json.dumps(adapter.request["schema"])


@pytest.mark.asyncio
async def test_invalid_dependency_falls_back_with_explicit_issue():
    draft = valid_draft()
    draft["tasks"][1]["dependsOn"] = [4]

    result = await route_model_plan(
        "Build a secure model planning API.",
        adapter=FakeAdapter(draft),
        now=datetime(2026, 8, 30, 19, 0, tzinfo=UTC),
    )

    assert result.route.source == "deterministic_fallback"
    assert result.route.verified is True
    assert [issue.code for issue in result.route.issues] == ["dependency_not_prior"]
    assert result.plan.tasks[-1].owner == "verification"


@pytest.mark.asyncio
async def test_handoff_that_bypasses_verification_is_rejected():
    draft = valid_draft()
    draft["tasks"][-1]["dependsOn"] = [2]

    result = await route_model_plan(
        "Build a secure model planning API.",
        adapter=FakeAdapter(draft),
        now=datetime(2026, 8, 30, 19, 0, tzinfo=UTC),
    )

    assert result.route.source == "deterministic_fallback"
    assert [issue.code for issue in result.route.issues] == ["handoff_bypasses_verification"]


@pytest.mark.asyncio
async def test_provider_failure_falls_back_without_exposing_raw_error():
    result = await route_model_plan(
        "Build a secure model planning API.",
        adapter=FakeAdapter(ModelGenerationError("secret provider detail")),
        now=datetime(2026, 8, 30, 19, 0, tzinfo=UTC),
    )

    assert result.route.source == "deterministic_fallback"
    assert result.route.issues[0].code == "provider_unavailable"
    assert "secret provider detail" not in result.route.issues[0].message
