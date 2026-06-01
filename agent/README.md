# Ask WTF Crew — agentic retrieval

A lean **CrewAI** team, instrumented by the **NVIDIA NeMo Agent Toolkit**
(`nvidia-nat`), running on **NVIDIA NIM**. It's the "Crew" mode behind Ask WTF;
the fast single-shot RAG (TypeScript, in `web/`) stays the default.

## Roles
1. **Query Planner** — decomposes the question into 2-3 focused search queries.
2. **Catalogue Researcher** — calls the retrieval tool (`nv-embedqa-e5-v5` over the
   timestamped index) and gathers numbered, timestamped evidence.
3. **Answer Synthesizer** — writes a grounded, `[n]`-cited answer and verifies each
   claim is supported (no citation, no claim).

## Run
```bash
cd agent
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -r requirements.txt
uv pip install nvidia-nat nvidia-nat-crewai      # NeMo Agent Toolkit
bash run.sh                                       # serves on http://localhost:8099
```
Needs `NVIDIA_API_KEY` (read from `~/.claude/.env`, or set in the environment).

## API
```
POST /ask  {"question": "...", "model": "meta/llama-3.3-70b-instruct"}
  -> {answer, sources[{n,title,time,url,...}], steps[], model, elapsed_s, nat}
GET  /health  -> {ok, chunks}
```

The Next.js app proxies to this via `/api/crew` (set `AGENT_URL` to override the
default `http://localhost:8099/ask`).

## Notes
- Reuses `web/src/data/vectors.json` (same timestamped index as fast mode).
- Agentic runs are slower than fast RAG (multiple model calls); expect ~30-60s.
- `nat` is imported for observability; the crew runs with or without it.
