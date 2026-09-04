from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Path, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .auth import require_service_auth, require_service_owner
from .config import get_settings
from .database import approve_plan, create_client, ensure_indexes, list_runs, save_plan
from .model_planner import route_model_plan
from .models import (
    GoalPlan,
    GoalRequest,
    HealthResponse,
    ModelPlanResult,
    ModelStatus,
    RunListResponse,
    RunSummary,
)
from .ollama import OllamaAdapter
from .planner import build_plan

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = create_client(settings.mongodb_uri)
    await client.admin.command("ping")
    database = client[settings.mongodb_database]
    await ensure_indexes(database)
    app.state.mongodb_client = client
    app.state.database = database
    yield
    await client.close()


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="Authenticated, privacy-first orchestration API for F.R.I.D.I.E.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-FRIDIE-User"],
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health(request: Request) -> HealthResponse:
    await request.app.state.database.command("ping")
    return HealthResponse(status="ok", service="fridie-api", database=settings.mongodb_database)


@app.post(
    "/api/v1/goals",
    response_model=GoalPlan,
    status_code=status.HTTP_201_CREATED,
    tags=["orchestration"],
)
async def create_goal_plan(
    payload: GoalRequest,
    request: Request,
    owner_id: Annotated[str, Depends(require_service_owner)],
) -> GoalPlan:
    if len(payload.goal) > settings.request_max_characters:
        raise HTTPException(status_code=422, detail="Goal exceeds the configured length limit.")
    try:
        plan = build_plan(payload.goal)
        return await save_plan(
            request.app.state.database,
            plan,
            owner_id=owner_id,
            project_id=payload.project_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post(
    "/api/v1/goals/model-assisted",
    response_model=ModelPlanResult,
    status_code=status.HTTP_201_CREATED,
    tags=["orchestration"],
)
async def create_model_assisted_goal_plan(
    payload: GoalRequest,
    request: Request,
    owner_id: Annotated[str, Depends(require_service_owner)],
) -> ModelPlanResult:
    if len(payload.goal) > settings.request_max_characters:
        raise HTTPException(status_code=422, detail="Goal exceeds the configured length limit.")

    adapter = OllamaAdapter(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
        timeout_seconds=settings.ollama_timeout_seconds,
    )
    try:
        result = await route_model_plan(payload.goal, adapter=adapter)
        saved_plan = await save_plan(
            request.app.state.database,
            result.plan,
            owner_id=owner_id,
            project_id=payload.project_id,
            planning_route=result.route,
        )
        return result.model_copy(update={"plan": saved_plan})
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/api/v1/runs", response_model=RunListResponse, tags=["orchestration"])
async def get_runs(
    request: Request,
    owner_id: Annotated[str, Depends(require_service_owner)],
    limit: int = Query(default=20, ge=1, le=100),
) -> RunListResponse:
    items = await list_runs(request.app.state.database, owner_id=owner_id, limit=limit)
    return RunListResponse(items=items, count=len(items))


@app.post(
    "/api/v1/runs/{trace_id}/approve",
    response_model=RunSummary,
    tags=["orchestration"],
)
async def approve_run(
    request: Request,
    owner_id: Annotated[str, Depends(require_service_owner)],
    trace_id: str = Path(pattern=r"^fri-\d{8}-\d{8}$"),
) -> RunSummary:
    try:
        return await approve_plan(request.app.state.database, trace_id, owner_id=owner_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Run not found.") from error


@app.get(
    "/api/v1/models/ollama/status",
    response_model=ModelStatus,
    tags=["models"],
    dependencies=[Depends(require_service_auth)],
)
async def ollama_status() -> ModelStatus:
    adapter = OllamaAdapter(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
        timeout_seconds=settings.ollama_timeout_seconds,
    )
    return await adapter.status()
