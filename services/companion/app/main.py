from __future__ import annotations

import json
import secrets
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FRIDIE_COMPANION_", extra="ignore")

    token: str = Field(min_length=32)
    applications_file: Path = Path("applications.json")
    audit_file: Path = Path("companion-audit.jsonl")
    approval_ttl_seconds: int = Field(default=60, ge=15, le=300)


class LaunchRequest(BaseModel):
    application_id: str = Field(pattern=r"^[a-z0-9_-]{1,40}$")
    reason: str = Field(min_length=8, max_length=300)


class Approval(BaseModel):
    approval_id: str
    application_id: str
    application_name: str
    reason: str
    expires_at: datetime


class ExecuteRequest(BaseModel):
    approval_id: str = Field(min_length=32, max_length=128)


@dataclass
class PendingApproval:
    application_id: str
    application_name: str
    executable: Path
    reason: str
    expires_at: datetime


def load_applications(path: Path) -> dict[str, dict[str, str]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("applications.json must contain an object")
    applications: dict[str, dict[str, str]] = {}
    for application_id, item in data.items():
        if not isinstance(item, dict) or set(item) != {"name", "executable"}:
            raise ValueError(f"Invalid application entry: {application_id}")
        executable = Path(item["executable"]).expanduser()
        if not executable.is_absolute():
            raise ValueError(f"Executable path must be absolute: {application_id}")
        applications[application_id] = {"name": item["name"], "executable": str(executable)}
    return applications


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or Settings()
    applications = load_applications(active_settings.applications_file)
    pending: dict[str, PendingApproval] = {}
    lock = Lock()
    app = FastAPI(title="F.R.I.D.I.E. Local Companion", version="0.1.0")

    def authorize(value: str | None) -> None:
        if value is None or not secrets.compare_digest(value, active_settings.token):
            raise HTTPException(status_code=401, detail="Invalid companion token.")

    def audit(action: str, outcome: str, **metadata: str) -> None:
        record = {
            "occurred_at": datetime.now(UTC).isoformat(),
            "action": action,
            "outcome": outcome,
            "metadata": metadata,
        }
        active_settings.audit_file.parent.mkdir(parents=True, exist_ok=True)
        with active_settings.audit_file.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, separators=(",", ":")) + "\n")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "scope": "loopback-only"}

    @app.get("/v1/applications")
    def list_applications(x_fridie_companion_token: str | None = Header(default=None)) -> dict:
        authorize(x_fridie_companion_token)
        return {
            "items": [
                {"id": application_id, "name": item["name"]}
                for application_id, item in sorted(applications.items())
            ]
        }

    @app.post("/v1/launch-requests", response_model=Approval, status_code=status.HTTP_201_CREATED)
    def request_launch(
        payload: LaunchRequest,
        x_fridie_companion_token: str | None = Header(default=None),
    ) -> Approval:
        authorize(x_fridie_companion_token)
        item = applications.get(payload.application_id)
        if item is None:
            audit("application.launch.requested", "denied", application_id=payload.application_id)
            raise HTTPException(status_code=404, detail="Application is not allowlisted.")
        executable = Path(item["executable"])
        if not executable.is_file():
            audit("application.launch.requested", "denied", application_id=payload.application_id)
            raise HTTPException(status_code=409, detail="Configured executable was not found.")
        approval_id = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(seconds=active_settings.approval_ttl_seconds)
        with lock:
            pending[approval_id] = PendingApproval(
                application_id=payload.application_id,
                application_name=item["name"],
                executable=executable,
                reason=payload.reason,
                expires_at=expires_at,
            )
        audit("application.launch.requested", "pending", application_id=payload.application_id)
        return Approval(
            approval_id=approval_id,
            application_id=payload.application_id,
            application_name=item["name"],
            reason=payload.reason,
            expires_at=expires_at,
        )

    @app.post("/v1/launches")
    def execute_launch(
        payload: ExecuteRequest,
        x_fridie_companion_token: str | None = Header(default=None),
    ) -> dict[str, str | int]:
        authorize(x_fridie_companion_token)
        with lock:
            approval = pending.pop(payload.approval_id, None)
        if approval is None:
            raise HTTPException(status_code=404, detail="Approval was not found or was already used.")
        if approval.expires_at <= datetime.now(UTC):
            audit("application.launch.executed", "denied", application_id=approval.application_id)
            raise HTTPException(status_code=410, detail="Approval expired.")
        process = subprocess.Popen([str(approval.executable)], shell=False)  # noqa: S603
        audit(
            "application.launch.executed",
            "success",
            application_id=approval.application_id,
            process_id=str(process.pid),
        )
        return {"status": "launched", "application_id": approval.application_id, "pid": process.pid}

    return app
