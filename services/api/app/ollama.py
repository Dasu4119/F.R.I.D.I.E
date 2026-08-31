import json
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import httpx

from .models import ModelStatus


class ModelGenerationError(RuntimeError):
    """A safe boundary error for local model generation failures."""


def extract_model_names(payload: object) -> list[str]:
    if not isinstance(payload, dict) or not isinstance(payload.get("models"), list):
        return []

    names: set[str] = set()
    for record in payload["models"]:
        if not isinstance(record, dict):
            continue
        candidate = record.get("name") or record.get("model")
        if isinstance(candidate, str) and candidate.strip():
            names.add(candidate.strip())
    return sorted(names)


class OllamaAdapter:
    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        timeout_seconds: float,
        client_factory: Callable[..., Any] = httpx.AsyncClient,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model.strip()
        self.timeout_seconds = timeout_seconds
        self.client_factory = client_factory

    async def status(self) -> ModelStatus:
        checked_at = datetime.now(UTC)
        configured = bool(self.model)
        try:
            async with self.client_factory(timeout=self.timeout_seconds) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                available_models = extract_model_names(response.json())
        except (httpx.HTTPError, ValueError, TypeError):
            return ModelStatus(
                configured=configured,
                connected=False,
                ready=False,
                model=self.model or None,
                available_models=[],
                message="Ollama is not reachable at the configured local address.",
                checked_at=checked_at,
            )

        ready = configured and self.model in available_models
        if not configured:
            message = "Ollama is connected. Set FRIDIE_OLLAMA_MODEL to choose a local model."
        elif not ready:
            message = "Ollama is connected, but the configured model is not installed."
        else:
            message = "The configured local model is available."

        return ModelStatus(
            configured=configured,
            connected=True,
            ready=ready,
            model=self.model or None,
            available_models=available_models,
            message=message,
            checked_at=checked_at,
        )

    async def generate(self, prompt: str) -> str:
        if not self.model:
            raise ValueError("FRIDIE_OLLAMA_MODEL must be configured before generation.")

        async with self.client_factory(timeout=self.timeout_seconds) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            payload = response.json()

        generated = payload.get("response") if isinstance(payload, dict) else None
        if not isinstance(generated, str) or not generated.strip():
            raise ValueError("Ollama returned an empty or malformed response.")
        return generated

    async def generate_structured(
        self,
        *,
        prompt: str,
        schema: dict[str, Any],
        system: str,
    ) -> dict[str, Any]:
        if not self.model:
            raise ModelGenerationError("A local model is not configured.")

        try:
            async with self.client_factory(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "system": system,
                        "format": schema,
                        "stream": False,
                        "options": {"temperature": 0, "seed": 42},
                    },
                )
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as error:
            raise ModelGenerationError("The local model request did not complete.") from error

        generated = payload.get("response") if isinstance(payload, dict) else None
        if not isinstance(generated, str) or not generated.strip():
            raise ModelGenerationError("The local model returned no structured response.")

        try:
            structured = json.loads(generated)
        except json.JSONDecodeError as error:
            raise ModelGenerationError("The local model returned invalid JSON.") from error
        if not isinstance(structured, dict):
            raise ModelGenerationError("The local model returned an invalid structured value.")
        return structured
