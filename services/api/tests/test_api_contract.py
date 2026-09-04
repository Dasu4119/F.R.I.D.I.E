from app.main import app


def test_model_assisted_route_is_published_in_openapi():
    schema = app.openapi()
    operation = schema["paths"]["/api/v1/goals/model-assisted"]["post"]

    assert operation["responses"]["201"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ModelPlanResult"
    }
    assert "ModelPlanRoute" in schema["components"]["schemas"]
    assert "VerificationIssue" in schema["components"]["schemas"]


def test_private_api_routes_publish_bearer_security_contract():
    schema = app.openapi()

    service_bearer = schema["components"]["securitySchemes"]["ServiceBearer"]
    assert service_bearer["type"] == "http"
    assert service_bearer["scheme"] == "bearer"
    for path, method in (
        ("/api/v1/goals", "post"),
        ("/api/v1/goals/model-assisted", "post"),
        ("/api/v1/runs", "get"),
        ("/api/v1/runs/{trace_id}/approve", "post"),
        ("/api/v1/models/ollama/status", "get"),
    ):
        assert {"ServiceBearer": []} in schema["paths"][path][method]["security"]
