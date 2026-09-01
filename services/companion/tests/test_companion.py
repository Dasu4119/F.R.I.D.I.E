import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import Settings, create_app


TOKEN = "t" * 32


def make_client(tmp_path: Path, executable: Path | None = None) -> TestClient:
    target = executable or tmp_path / "missing.exe"
    config = tmp_path / "applications.json"
    config.write_text(
        json.dumps({"test-app": {"name": "Test App", "executable": str(target)}}),
        encoding="utf-8",
    )
    return TestClient(
        create_app(
            Settings(
                token=TOKEN,
                applications_file=config,
                audit_file=tmp_path / "audit.jsonl",
            )
        )
    )


def test_requires_token(tmp_path: Path) -> None:
    response = make_client(tmp_path).get("/v1/applications")
    assert response.status_code == 401


def test_rejects_non_allowlisted_application(tmp_path: Path) -> None:
    response = make_client(tmp_path).post(
        "/v1/launch-requests",
        headers={"X-FRIDIE-Companion-Token": TOKEN},
        json={"application_id": "powershell", "reason": "Run an arbitrary command"},
    )
    assert response.status_code == 404


def test_missing_executable_cannot_be_approved(tmp_path: Path) -> None:
    response = make_client(tmp_path).post(
        "/v1/launch-requests",
        headers={"X-FRIDIE-Companion-Token": TOKEN},
        json={"application_id": "test-app", "reason": "Open the approved design tool"},
    )
    assert response.status_code == 409

