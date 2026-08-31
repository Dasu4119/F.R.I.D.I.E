from datetime import UTC, datetime

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient, IndexModel, ReturnDocument

from .models import GoalPlan, ModelPlanRoute, RunSummary


async def ensure_indexes(database) -> None:
    await database.runs.create_indexes(
        [
            IndexModel([("trace_id", ASCENDING)], unique=True, name="trace_id_unique"),
            IndexModel(
                [("project_id", ASCENDING), ("created_at", DESCENDING)], name="project_runs"
            ),
            IndexModel([("owner_id", ASCENDING), ("created_at", DESCENDING)], name="owner_runs"),
        ]
    )
    await database.tasks.create_indexes(
        [
            IndexModel([("task_id", ASCENDING)], unique=True, name="task_id_unique"),
            IndexModel([("run_id", ASCENDING), ("sequence", ASCENDING)], name="run_tasks"),
        ]
    )
    await database.projects.create_index(
        [("owner_id", ASCENDING), ("updated_at", DESCENDING)], name="owner_projects"
    )
    await database.memories.create_index(
        [("project_id", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)],
        name="approved_project_memory",
    )
    await database.documents.create_index(
        [("project_id", ASCENDING), ("sha256", ASCENDING)],
        unique=True,
        name="project_document_hash",
    )
    await database.audit_logs.create_index(
        [("trace_id", ASCENDING), ("occurred_at", ASCENDING)], name="trace_audit"
    )


async def save_plan(
    database,
    plan: GoalPlan,
    *,
    owner_id: str,
    project_id: str | None,
    planning_route: ModelPlanRoute | None = None,
) -> GoalPlan:
    now = datetime.now(UTC)
    if project_id is None:
        project = await database.projects.insert_one(
            {
                "owner_id": owner_id,
                "name": plan.objective[:80],
                "status": "active",
                "created_at": now,
                "updated_at": now,
            }
        )
        project_id = str(project.inserted_id)

    plan.project_id = project_id
    run_document = plan.model_dump(mode="python", by_alias=False)
    run_document["project_id"] = project_id
    run_document["owner_id"] = owner_id
    run_document["task_count"] = len(plan.tasks)
    run_document["planning_source"] = planning_route.source if planning_route else "deterministic"
    if planning_route:
        run_document["model_route"] = planning_route.model_dump(mode="python", by_alias=False)
    run_result = await database.runs.insert_one(run_document)
    run_id = str(run_result.inserted_id)

    if plan.tasks:
        await database.tasks.insert_many(
            [
                {
                    **task.model_dump(mode="python", by_alias=False),
                    "task_id": f"{plan.trace_id}:{task.id}",
                    "run_id": run_id,
                    "project_id": project_id,
                    "created_at": now,
                    "updated_at": now,
                }
                for task in plan.tasks
            ]
        )
    audit_document = {
        "trace_id": plan.trace_id,
        "actor_id": owner_id,
        "action": "goal.plan.created",
        "object_type": "run",
        "object_id": run_id,
        "outcome": "success",
        "occurred_at": now,
    }
    if planning_route:
        audit_document["metadata"] = {
            "planning_source": planning_route.source,
            "model": planning_route.model,
            "verified": planning_route.verified,
            "issue_codes": [issue.code for issue in planning_route.issues],
        }
    await database.audit_logs.insert_one(audit_document)
    return plan


def _summarize_run(document: dict) -> RunSummary:
    return RunSummary.model_validate(
        {
            "trace_id": document["trace_id"],
            "project_id": document["project_id"],
            "objective": document["objective"],
            "status": document["status"],
            "confidence": document["confidence"],
            "task_count": document["task_count"],
            "created_at": document["created_at"],
            "approved_at": document.get("approved_at"),
            "planning_source": document.get("planning_source", "deterministic"),
        }
    )


async def list_runs(database, *, owner_id: str, limit: int) -> list[RunSummary]:
    projection = {
        "_id": 0,
        "trace_id": 1,
        "project_id": 1,
        "objective": 1,
        "status": 1,
        "confidence": 1,
        "task_count": 1,
        "created_at": 1,
        "approved_at": 1,
        "planning_source": 1,
    }
    cursor = database.runs.find({"owner_id": owner_id}, projection).sort(
        "created_at", DESCENDING
    ).limit(limit)
    documents = await cursor.to_list(limit)
    return [_summarize_run(document) for document in documents]


async def approve_plan(database, trace_id: str, *, owner_id: str) -> RunSummary:
    now = datetime.now(UTC)
    document = await database.runs.find_one_and_update(
        {"trace_id": trace_id, "owner_id": owner_id, "status": "planned"},
        {"$set": {"status": "approved", "approved_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if document is not None:
        await database.audit_logs.insert_one(
            {
                "trace_id": trace_id,
                "actor_id": owner_id,
                "action": "goal.plan.approved",
                "object_type": "run",
                "object_id": str(document.get("_id", trace_id)),
                "outcome": "success",
                "occurred_at": now,
            }
        )
        return _summarize_run(document)

    existing = await database.runs.find_one(
        {"trace_id": trace_id, "owner_id": owner_id},
        {
            "_id": 0,
            "trace_id": 1,
            "project_id": 1,
            "objective": 1,
            "status": 1,
            "confidence": 1,
            "task_count": 1,
            "created_at": 1,
            "approved_at": 1,
            "planning_source": 1,
        },
    )
    if existing is None:
        raise KeyError(trace_id)
    return _summarize_run(existing)


def create_client(uri: str) -> AsyncMongoClient:
    return AsyncMongoClient(uri, serverSelectionTimeoutMS=5_000, appname="fridie-api")
