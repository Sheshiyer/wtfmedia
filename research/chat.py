"""Dedicated process for bounded, no-search follow-up; stdout is a private IPC pipe."""
import asyncio
import contextlib
import json
import os
import sys

from .contracts import ChatInput
from .evidence import validate_report
from .providers import Calls
from .store import Store
from .worker import state_path


async def run():
    body = ChatInput.model_validate_json(sys.stdin.buffer.read(1_200_001)).model_dump(exclude_none=True)
    store = Store(state_path())
    claim = store.claim_id(sys.argv[1])
    if claim is None:
        raise RuntimeError('follow-up missing')
    calls = Calls(store, claim[0], claim[1])
    with open(os.devnull, 'w') as sink, contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
        from .gptr import GPTREngine
        answer = await GPTREngine(calls).chat(body)
        answer, _ = validate_report(answer, body['sources'])
    print(json.dumps({'answer': answer, 'cost': store.get(claim[0])['cost']}))


if __name__ == '__main__':
    asyncio.run(run())
