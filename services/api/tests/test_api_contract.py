from app.main import app


def test_model_assisted_route_is_published_in_openapi():
    schema = app.openapi()
    operation = schema["paths"]["/api/v1/goals/model-assisted"]["post"]

    assert operation["responses"]["201"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ModelPlanResult"
    }
    assert "ModelPlanRoute" in schema["components"]["schemas"]
    assert "VerificationIssue" in schema["components"]["schemas"]
