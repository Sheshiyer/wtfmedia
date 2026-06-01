#!/usr/bin/env bash
# Start the Ask WTF Crew service (CrewAI + NeMo Agent Toolkit) on :8099.
# NVIDIA key is read from ~/.claude/.env by nim.py (no sourcing needed).
set -euo pipefail
cd "$(dirname "$0")"
source .venv/bin/activate
exec uvicorn server:app --host 127.0.0.1 --port "${PORT:-8099}"
