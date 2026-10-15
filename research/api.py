"""Private token-authenticated service; Edge owns user authorization."""
import asyncio
import hmac
import os
import subprocess
import sys
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .remote_store import open_store
from .contracts import ChatInput, JobInput
from .providers import configured
from .store import Conflict, Gone, QueueFull
from .worker import state_path


def valid_id(job_id):
    try:
        if not job_id.startswith('rrun_') or str(UUID(job_id[5:])) != job_id[5:]:
            raise ValueError()
    except ValueError:
        raise HTTPException(422, 'invalid job ID') from None
    return job_id


class BodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        total = 0
        async def bounded_receive():
            nonlocal total
            message = await receive()
            total += len(message.get('body', b''))
            if total > 1_200_000:
                raise HTTPException(413, 'request too large')
            return message
        await self.app(scope, bounded_receive, send)


def create_app(store=None, ready=configured, chat_handler=None, start_workers=False):
    @asynccontextmanager
    async def lifespan(app):
        os.umask(0o077)
        app.state.store = store or open_store(state_path())
        processes = []
        async def supervise():
            while True:
                processes[:] = [p for p in processes if p.poll() is None]
                if not processes:
                    processes.append(subprocess.Popen([sys.executable, '-m', 'research.worker'],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
                await asyncio.sleep(1)
        task = asyncio.create_task(supervise()) if start_workers else None
        try:
            yield
        finally:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            for process in processes:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(BodyLimit)

    def auth(authorization: str | None = Header(default=None)):
        expected = os.environ.get('RESEARCH_RUNNER_TOKEN', '')
        supplied = authorization.removeprefix('Bearer ') if authorization and authorization.startswith('Bearer ') else ''
        if not expected or not hmac.compare_digest(supplied.encode(), expected.encode()):
            raise HTTPException(401, 'unauthorized')

    def database(request: Request):
        return request.app.state.store

    def require_ready():
        if not ready():
            raise HTTPException(503, 'runner not configured')

    @app.exception_handler(RequestValidationError)
    async def invalid(request, exc):
        # FastAPI's default validation output includes input bodies; never echo private data.
        return JSONResponse(status_code=422, content={'detail': 'invalid request'})

    @app.get('/health', dependencies=[Depends(auth)])
    def health():
        return {'configured': ready()}

    @app.post('/jobs', status_code=202, dependencies=[Depends(auth), Depends(require_ready)])
    def submit(body: JobInput, db=Depends(database)):
        try:
            return db.submit(body.model_dump(exclude_none=True))
        except Conflict:
            raise HTTPException(409, 'job ID already used for a different body') from None
        except Gone:
            raise HTTPException(410, 'job ID retired') from None
        except QueueFull:
            raise HTTPException(429, 'runner queue full') from None

    @app.get('/jobs/{job_id}', dependencies=[Depends(auth)])
    def get(job_id: str, db=Depends(database)):
        result = db.get(valid_id(job_id))
        if result is None:
            raise HTTPException(404, 'job not found')
        return result

    @app.post('/jobs/{job_id}/cancel', dependencies=[Depends(auth)])
    def cancel(job_id: str, db=Depends(database)):
        return db.cancel(valid_id(job_id))

    @app.delete('/jobs/{job_id}', status_code=204, dependencies=[Depends(auth)])
    def delete(job_id: str, db=Depends(database)):
        db.delete(valid_id(job_id))
        return Response(status_code=204)

    chat_lock = asyncio.Lock()

    @app.post('/chat', dependencies=[Depends(auth), Depends(require_ready)])
    async def chat(body: ChatInput, db=Depends(database)):
        if chat_lock.locked():
            raise HTTPException(429, 'chat busy')
        async with chat_lock:
            if chat_handler:
                return await chat_handler(body.model_dump(exclude_none=True))
            # A disposable SQLite job reserves costs before a separate process calls the model.
            # No follow-up bodies or messages survive the response or a failed request.
            job_id = 'rrun_' + str(uuid4())
            chat_body = JobInput(id=job_id, title='Private follow-up', budgetMicro=500000).model_dump(exclude_none=True)
            try:
                db.submit(chat_body, kind='chat')
            except QueueFull:
                raise HTTPException(429, 'runner queue full') from None
            process = None
            try:
                process = await asyncio.create_subprocess_exec(sys.executable, '-m', 'research.chat', job_id,
                    stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.DEVNULL,
                    env={**os.environ, 'RESEARCH_RUNNER_DB': db.path})
                import json
                output, _ = await asyncio.wait_for(process.communicate(json.dumps(body.model_dump(exclude_none=True)).encode()), 55)
                if process.returncode != 0:
                    raise HTTPException(503, 'follow-up unavailable')
                return json.loads(output)
            except (asyncio.TimeoutError, ValueError):
                raise HTTPException(503, 'follow-up unavailable') from None
            finally:
                if process and process.returncode is None:
                    process.kill()
                    await process.wait()
                db.delete(job_id)

    return app


app = create_app(start_workers=True)
