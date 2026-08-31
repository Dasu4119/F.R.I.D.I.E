from datetime import datetime

import pytest

from app.ollama import OllamaAdapter, extract_model_names


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeClient:
    def __init__(self, payload):
        self.payload = payload
        self.last_post = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def get(self, url):
        assert url == "http://localhost:11434/api/tags"
        return FakeResponse(self.payload)

    async def post(self, url, **kwargs):
        self.last_post = (url, kwargs)
        return FakeResponse(self.payload)


def test_extract_model_names_ignores_malformed_records():
    assert extract_model_names(
        {"models": [{"name": "qwen3:8b"}, {"model": "gemma4"}, {"name": ""}, "bad"]}
    ) == ["gemma4", "qwen3:8b"]


@pytest.mark.asyncio
async def test_status_reports_configured_model_truthfully():
    adapter = OllamaAdapter(
        base_url="http://localhost:11434",
        model="qwen3:8b",
        timeout_seconds=1,
        client_factory=lambda **_kwargs: FakeClient(
            {"models": [{"name": "qwen3:8b"}, {"name": "gemma4"}]}
        ),
    )

    status = await adapter.status()

    assert status.connected is True
    assert status.configured is True
    assert status.ready is True
    assert status.model == "qwen3:8b"
    assert status.available_models == ["gemma4", "qwen3:8b"]
    assert isinstance(status.checked_at, datetime)


@pytest.mark.asyncio
async def test_structured_generation_sends_schema_and_disables_streaming():
    client = FakeClient({"response": '{"summary":"A constrained plan"}'})
    adapter = OllamaAdapter(
        base_url="http://localhost:11434",
        model="qwen3:8b",
        timeout_seconds=1,
        client_factory=lambda **_kwargs: client,
    )
    schema = {"type": "object", "properties": {"summary": {"type": "string"}}}

    generated = await adapter.generate_structured(
        prompt="Plan this goal as structured data.",
        schema=schema,
        system="Return only the requested plan.",
    )

    assert generated == {"summary": "A constrained plan"}
    assert client.last_post == (
        "http://localhost:11434/api/generate",
        {
            "json": {
                "model": "qwen3:8b",
                "prompt": "Plan this goal as structured data.",
                "system": "Return only the requested plan.",
                "format": schema,
                "stream": False,
                "options": {"temperature": 0, "seed": 42},
            }
        },
    )
