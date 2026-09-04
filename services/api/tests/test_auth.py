import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr

from app.auth import require_service_auth, require_service_owner
from app.config import get_settings
from app.main import app


@pytest.fixture
def configured_service_token():
    settings = get_settings()
    original = settings.service_token
    settings.service_token = SecretStr("test-service-token-with-sufficient-entropy")
    try:
        yield
    finally:
        settings.service_token = original


def credentials(value: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=value)


def test_service_auth_rejects_missing_and_incorrect_credentials(configured_service_token):
    with pytest.raises(HTTPException) as missing:
        require_service_auth(None)
    with pytest.raises(HTTPException) as incorrect:
        require_service_auth(credentials("wrong-token"))

    assert missing.value.status_code == 401
    assert missing.value.headers == {"WWW-Authenticate": "Bearer"}
    assert incorrect.value.status_code == 401


def test_service_owner_requires_valid_token_and_opaque_owner(configured_service_token):
    valid = credentials("test-service-token-with-sufficient-entropy")

    assert require_service_owner(valid, "site-owner-123") == "site-owner-123"
    with pytest.raises(HTTPException) as missing_owner:
        require_service_owner(valid, None)
    with pytest.raises(HTTPException) as unsafe_owner:
        require_service_owner(valid, "owner with spaces")

    assert missing_owner.value.status_code == 401
    assert unsafe_owner.value.status_code == 401


@pytest.mark.asyncio
async def test_private_route_rejects_unauthenticated_http_request(configured_service_token):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/runs")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
