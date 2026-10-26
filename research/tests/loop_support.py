"""Restricted Linux sandbox denies asyncio's self-pipe send; timer wakes tests only."""
import asyncio
import socket


def enable_if_needed():
    first, second = socket.socketpair()
    try:
        first.setblocking(False)
        try:
            first.send(b'x')
            return
        except PermissionError:
            pass
    finally:
        first.close()
        second.close()

    class SandboxPolicy(asyncio.DefaultEventLoopPolicy):
        def new_event_loop(self):
            loop = super().new_event_loop()
            def tick():
                loop.call_later(0.01, tick)
            tick()
            return loop
    asyncio.set_event_loop_policy(SandboxPolicy())
