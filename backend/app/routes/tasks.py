from fastapi import APIRouter

from app.services.task_service import get_task, list_tasks

router = APIRouter()


@router.get("/")
async def get_tasks(limit: int = 20):
    tasks = await list_tasks(limit=limit)
    return tasks


@router.get("/{task_id}")
async def get_task_status(task_id: str):
    task = await get_task(task_id)
    if not task:
        return {"id": task_id, "status": "unknown", "error": "Task not found"}
    return task
