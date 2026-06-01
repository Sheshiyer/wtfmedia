"""NVIDIA NIM glue for the CrewAI crew."""
from __future__ import annotations

import os
from pathlib import Path

DEFAULT_MODEL = "meta/llama-3.3-70b-instruct"
NIM_BASE = "https://integrate.api.nvidia.com/v1"


def nvidia_key() -> str:
    k = os.environ.get("NVIDIA_API_KEY")
    if k:
        return k
    env = Path.home() / ".claude" / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.strip().startswith("NVIDIA_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("NVIDIA_API_KEY not set")


def nim_llm(model: str = DEFAULT_MODEL, temperature: float = 0.3):
    """CrewAI LLM bound to an NVIDIA NIM model via the OpenAI-compatible API."""
    from crewai import LLM

    return LLM(
        model=f"openai/{model}",
        base_url=NIM_BASE,
        api_key=nvidia_key(),
        temperature=temperature,
    )
