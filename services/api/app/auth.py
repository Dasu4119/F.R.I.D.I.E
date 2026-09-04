from hmac import compare_digest
from typing import Annotated

from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

service_bearer = HTTPBearer(
    auto_error=False,
    scheme_name="ServiceBearer",
    description="Server-to-server bearer token. Never expose this credential to a browser.",
)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid service credentials are required.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_service_auth(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Security(service_bearer),
    ],
) -> None:
    expected = get_settings().service_token.get_secret_value()
    if (
        credentials is None
        or credentials.scheme.lower() != "bearer"
        or not expected
        or not compare_digest(credentials.credentials, expected)
    ):
        raise _unauthorized()


def require_service_owner(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Security(service_bearer),
    ],
    x_fridie_user: Annotated[str | None, Header(max_length=128)] = None,
) -> str:
    require_service_auth(credentials)
    owner_id = (x_fridie_user or "").strip()
    has_unsafe_character = any(
        character.isspace() or ord(character) < 32 for character in owner_id
    )
    if len(owner_id) < 3 or has_unsafe_character:
        raise _unauthorized()
    return owner_id
