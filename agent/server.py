"""FastAPI service exposing the Ask WTF Crew.

POST /ask  {question, model?}  ->  {answer, sources[], steps[], model, elapsed_s}
GET  /health
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from crew import run_crew
from nim import DEFAULT_MODEL
import retriever

app = FastAPI(title="Ask WTF Crew", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3939"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskBody(BaseModel):
    question: str
    model: str | None = None


@app.get("/health")
def health():
    try:
        n = len(retriever._load()["meta"])
        return {"ok": True, "chunks": n}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/ask")
def ask(body: AskBody):
    model = body.model or DEFAULT_MODEL
    try:
        return run_crew(body.question, model)
    except Exception as e:
        return {"error": str(e), "answer": "", "sources": [], "steps": []}
