# FastAPI Cloud deployment

The production API is deployed from this directory to FastAPI Cloud.

Required environment variables:

- `FRIDIE_MONGODB_URI` (secret)
- `FRIDIE_MONGODB_DATABASE=FRIDIE`
- `FRIDIE_ENVIRONMENT=production`
- `FRIDIE_CORS_ORIGINS=https://fridie-ai.dasanjaneyulu5.chatgpt.site`

The application performs a MongoDB ping and creates required indexes during
startup. A deployment is ready only after that startup check succeeds.
Index definitions are owned by `app/database.py`; do not pre-create indexes
with the same names and different key orders.
