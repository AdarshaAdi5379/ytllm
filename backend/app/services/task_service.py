import asyncio
import uuid
import time
from typing import Any, Callable, Coroutine

_task_store: dict[str, dict] = {}
_store_lock = asyncio.Lock()


async def create_task(task_type: str, name: str, fn: Callable[[str], Coroutine[Any, Any, Any]]) -> str:
    task_id = str(uuid.uuid4())
    now = time.time()
    async with _store_lock:
        _task_store[task_id] = {
            "id": task_id,
            "type": task_type,
            "name": name,
            "status": "queued",
            "error": None,
            "result": None,
            "progress": None,
            "created_at": now,
            "updated_at": now,
        }

    async def _run():
        async with _store_lock:
            if task_id in _task_store:
                _task_store[task_id]["status"] = "processing"
                _task_store[task_id]["updated_at"] = time.time()
        try:
            result = await fn(task_id)
            async with _store_lock:
                if task_id in _task_store:
                    _task_store[task_id]["status"] = "done"
                    _task_store[task_id]["result"] = str(result) if result else None
                    _task_store[task_id]["updated_at"] = time.time()
        except Exception as e:
            async with _store_lock:
                if task_id in _task_store:
                    _task_store[task_id]["status"] = "failed"
                    _task_store[task_id]["error"] = str(e)
                    _task_store[task_id]["updated_at"] = time.time()

    asyncio.create_task(_run())
    return task_id


async def update_task_progress(task_id: str, current: int, total: int, phase: str) -> None:
    async with _store_lock:
        if task_id in _task_store:
            _task_store[task_id]["progress"] = {"current": current, "total": total, "phase": phase}
            _task_store[task_id]["updated_at"] = time.time()


async def get_task(task_id: str) -> dict | None:
    async with _store_lock:
        entry = _task_store.get(task_id)
        if entry:
            return dict(entry)
        return None


async def list_tasks(limit: int = 20) -> list[dict]:
    async with _store_lock:
        sorted_tasks = sorted(
            _task_store.values(), key=lambda t: t["created_at"], reverse=True
        )
        return [dict(t) for t in sorted_tasks[:limit]]
