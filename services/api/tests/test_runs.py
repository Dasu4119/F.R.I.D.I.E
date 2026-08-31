from copy import deepcopy
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.database import approve_plan, list_runs


class FakeCursor:
    def __init__(self, documents):
        self.documents = documents

    def sort(self, key, direction):
        self.documents.sort(key=lambda item: item[key], reverse=direction < 0)
        return self

    def limit(self, limit):
        self.documents = self.documents[:limit]
        return self

    async def to_list(self, length=None):
        return deepcopy(self.documents[:length])


class FakeRuns:
    def __init__(self, documents):
        self.documents = documents

    def find(self, query, _projection):
        return FakeCursor(
            [deepcopy(item) for item in self.documents if item["owner_id"] == query["owner_id"]]
        )

    async def find_one_and_update(self, query, update, **_kwargs):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                document.update(update["$set"])
                return deepcopy(document)
        return None

    async def find_one(self, query, _projection=None):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return deepcopy(document)
        return None


class FakeAuditLogs:
    def __init__(self):
        self.documents = []

    async def insert_one(self, document):
        self.documents.append(deepcopy(document))


def run_document(trace_id="fri-20260830-12345678"):
    return {
        "trace_id": trace_id,
        "owner_id": "local-user",
        "project_id": "project-1",
        "objective": "Build a controlled approval flow",
        "status": "planned",
        "confidence": 0.84,
        "task_count": 4,
        "created_at": datetime(2026, 8, 30, 18, 0, tzinfo=UTC),
    }


@pytest.mark.asyncio
async def test_approve_plan_is_idempotent_and_audited_once():
    database = SimpleNamespace(runs=FakeRuns([run_document()]), audit_logs=FakeAuditLogs())

    first = await approve_plan(database, "fri-20260830-12345678", owner_id="local-user")
    second = await approve_plan(database, "fri-20260830-12345678", owner_id="local-user")

    assert first.status == "approved"
    assert first.approved_at is not None
    assert second.status == "approved"
    assert len(database.audit_logs.documents) == 1
    assert database.audit_logs.documents[0]["action"] == "goal.plan.approved"


@pytest.mark.asyncio
async def test_list_runs_is_owner_scoped_and_bounded():
    documents = [
        run_document("fri-20260830-12345678"),
        {**run_document("fri-20260830-87654321"), "owner_id": "someone-else"},
    ]
    database = SimpleNamespace(runs=FakeRuns(documents))

    result = await list_runs(database, owner_id="local-user", limit=10)

    assert [item.trace_id for item in result] == ["fri-20260830-12345678"]
