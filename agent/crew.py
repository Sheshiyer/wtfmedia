"""Ask WTF Crew — a lean 3-role CrewAI team on NVIDIA NIM.

Planner  -> decomposes the question into focused sub-queries
Retriever-> (Researcher agent + retrieval tool) gathers timestamped evidence
Synthesizer -> writes a grounded, cited, timestamped answer (with a verify pass)

NeMo Agent Toolkit is used (when importable) to trace/profile the run; the crew
runs the same either way.
"""
from __future__ import annotations

import time
from typing import Any

from crewai import Agent, Task, Crew, Process
from crewai.tools import BaseTool
from pydantic import PrivateAttr

from nim import nim_llm, DEFAULT_MODEL
import retriever

# optional NeMo Agent Toolkit observability
try:  # pragma: no cover
    import nat  # noqa: F401
    NAT_AVAILABLE = True
except Exception:
    NAT_AVAILABLE = False


class WTFRetrievalTool(BaseTool):
    name: str = "wtf_catalogue_search"
    description: str = (
        "Search the WTF podcast transcript catalogue. Input a focused search "
        "query string. Returns the most relevant timestamped excerpts, each "
        "numbered [n] with its episode title and timestamp. Use the [n] markers "
        "as citations."
    )
    _collector: dict = PrivateAttr()

    def __init__(self, collector: dict, **kw):
        super().__init__(**kw)
        self._collector = collector

    def _run(self, query: str) -> str:
        hits = retriever.search(query, k=5)
        out_lines = []
        for h in hits:
            key = (h["video_id"], h["start"])
            existing = next(
                (s for s in self._collector["sources"] if (s["video_id"], s["start"]) == key),
                None,
            )
            if existing:
                n = existing["n"]
            else:
                n = len(self._collector["sources"]) + 1
                self._collector["sources"].append({**h, "n": n})
            t = f" @ {h['time']}" if h["time"] else ""
            out_lines.append(f"[{n}] ({h['title']}{t})\n{h['text']}")
        return "\n\n---\n\n".join(out_lines) if out_lines else "No relevant excerpts found."


def run_crew(question: str, model: str = DEFAULT_MODEL) -> dict[str, Any]:
    collector: dict = {"sources": [], "steps": []}
    llm = nim_llm(model)
    tool = WTFRetrievalTool(collector)

    planner = Agent(
        role="Query Planner",
        goal="Break a question about the WTF podcast catalogue into 2-3 focused, "
             "non-overlapping search queries that will surface the best evidence.",
        backstory="You are precise and strategic. You know good retrieval starts "
                  "with good queries.",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )
    researcher = Agent(
        role="Catalogue Researcher",
        goal="Use the wtf_catalogue_search tool on each planned query to gather "
             "the strongest timestamped evidence. Keep the [n] citation markers.",
        backstory="You live inside the transcripts. You only trust what the tool "
                  "returns and never invent quotes.",
        llm=llm,
        tools=[tool],
        verbose=False,
        allow_delegation=False,
    )
    synthesizer = Agent(
        role="Answer Synthesizer",
        goal="Write a concise, grounded answer using ONLY the gathered evidence. "
             "Cite claims inline with the [n] markers. Verify each sentence is "
             "supported; if the evidence doesn't cover it, say so plainly.",
        backstory="You are exact. Receipts over vibes. No claim without a citation.",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    plan_task = Task(
        description=f"Question: {question}\n\nProduce 2-3 focused search queries "
                    "(one per line) that together cover what's needed to answer it.",
        expected_output="2-3 search queries, one per line.",
        agent=planner,
    )
    research_task = Task(
        description="For EACH planned query, call wtf_catalogue_search and collect "
                    "the returned [n] excerpts. Compile the evidence verbatim, "
                    "preserving the [n] markers and timestamps.",
        expected_output="A compiled list of [n] excerpts with titles and timestamps.",
        agent=researcher,
        context=[plan_task],
    )
    synth_task = Task(
        description=f"Using only the gathered evidence, answer the question:\n"
                    f"{question}\n\nCite with [n]. Be concise. If evidence is thin, "
                    "say what's missing. Do not invent episodes or quotes.",
        expected_output="A grounded, [n]-cited answer in plain language.",
        agent=synthesizer,
        context=[research_task],
    )

    def step_cb(step):
        try:
            who = getattr(getattr(step, "agent", None), "role", None) or "agent"
        except Exception:
            who = "agent"
        collector["steps"].append({"role": who, "t": round(time.time(), 2)})

    crew = Crew(
        agents=[planner, researcher, synthesizer],
        tasks=[plan_task, research_task, synth_task],
        process=Process.sequential,
        step_callback=step_cb,
        verbose=False,
    )

    t0 = time.time()
    result = crew.kickoff()
    elapsed = round(time.time() - t0, 2)

    answer = str(getattr(result, "raw", result))
    # build an ordered, readable step timeline (one entry per task)
    timeline = [
        {"role": "Query Planner", "summary": str(getattr(plan_task.output, "raw", "") )[:280]},
        {"role": "Catalogue Researcher", "summary": f"{len(collector['sources'])} excerpts retrieved"},
        {"role": "Answer Synthesizer", "summary": "grounded answer composed"},
    ]

    return {
        "answer": answer,
        "sources": collector["sources"],
        "steps": timeline,
        "model": model,
        "elapsed_s": elapsed,
        "nat": NAT_AVAILABLE,
    }
