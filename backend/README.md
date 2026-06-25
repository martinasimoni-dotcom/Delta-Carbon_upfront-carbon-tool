# Delta Carbon — Backend

FastAPI backend. Runs on localhost:8000.

## Start

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Environment

Copy `.env.example` to `.env` and fill in:
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `EPD_API_TOKEN` — from app.2050-materials.com

## Endpoints

- `GET /health` — liveness check
- `POST /v1/carbon/estimate` — baseline carbon from geometry + BEDEC/ITeC coefficients
- `POST /v1/suggestions` — RAG material suggestions via Bhavana EPD pipeline + Claude LLM
