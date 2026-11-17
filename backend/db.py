"""
SplitEase Centralized Database Connection Manager
Provides safe, persistent, single-event-loop Prisma connection lifecycle.
Completely eliminates multi-thread event loop collisions and per-request connection overhead.
"""
import asyncio
import threading
from functools import wraps
from prisma import Prisma

_loop = None
_loop_thread = None
_db = None
_lock = threading.Lock()


def _ensure_engine():
    global _loop, _loop_thread, _db
    if _db is not None and _db.is_connected():
        return _db, _loop

    with _lock:
        if _db is not None and _db.is_connected():
            return _db, _loop

        if _loop is None:
            _loop = asyncio.new_event_loop()

            def _run_loop(l):
                asyncio.set_event_loop(l)
                l.run_forever()

            _loop_thread = threading.Thread(
                target=_run_loop,
                args=(_loop,),
                daemon=True,
                name="PrismaEventLoop"
            )
            _loop_thread.start()

        if _db is None:
            _db = Prisma()

        async def _connect():
            if not _db.is_connected():
                await _db.connect()

        future = asyncio.run_coroutine_threadsafe(_connect(), _loop)
        future.result()
        return _db, _loop


def run_db_coro(coro_fn, *args, **kwargs):
    """
    Executes an async DB coroutine thread-safely on the dedicated Prisma event loop.
    Passes the persistent connected Prisma instance 'db' as the first positional argument.
    """
    db, loop = _ensure_engine()
    future = asyncio.run_coroutine_threadsafe(coro_fn(db, *args, **kwargs), loop)
    return future.result()


def with_db(func):
    """
    Decorator that injects the connected Prisma instance 'db' into async handlers,
    running safely on the dedicated Prisma loop.
    Works seamlessly with Flask route handlers and @token_required.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        return run_db_coro(func, *args, **kwargs)
    return wrapper
