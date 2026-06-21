from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user, verify_workspace_access
from app.db_models import User, Source
from app.services import actions_service


router = APIRouter()

VALID_ACTIONS = ("explain", "simplify", "translate", "expand", "compare", "examples", "code", "quiz")


class ActionRequest(BaseModel):
    source_id: str
    action_type: str
    concept: str | None = None
    concept1: str | None = None
    concept2: str | None = None
    language: str | None = None
    topic: str | None = None
    description: str | None = None


class ActionResponse(BaseModel):
    action_type: str
    source_id: str
    source_title: str
    content: str


@router.post("/run", response_model=ActionResponse)
async def run_action(
    req: ActionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.action_type not in VALID_ACTIONS:
        raise HTTPException(
            status_code=422,
            detail={"error": "INVALID_ACTION", "message": f"Action must be one of: {', '.join(VALID_ACTIONS)}"},
        )

    source_result = await db.execute(
        select(Source).where(
            Source.id == req.source_id,
            Source.status == "ready",
        )
    )
    source = source_result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Source not found or not ready."})

    await verify_workspace_access(db, source.workspace_id, user.id)

    params: dict = {}
    if req.action_type == "explain" and req.concept:
        params["concept"] = req.concept
    elif req.action_type == "translate" and req.language:
        params["language"] = req.language
    elif req.action_type == "expand" and req.topic:
        params["topic"] = req.topic
    elif req.action_type == "compare":
        params["concept1"] = req.concept1 or "Concept A"
        params["concept2"] = req.concept2 or "Concept B"
    elif req.action_type == "examples" and req.concept:
        params["concept"] = req.concept
    elif req.action_type == "code" and req.description:
        params["description"] = req.description

    # Validate required params
    action_param_map = {
        "explain": ("concept",),
        "translate": ("language",),
        "expand": ("topic",),
        "compare": ("concept1", "concept2"),
        "examples": ("concept",),
        "code": ("description",),
    }
    required = action_param_map.get(req.action_type, ())
    for p in required:
        if not params.get(p):
            raise HTTPException(
                status_code=422,
                detail={"error": "MISSING_PARAM", "message": f"Action '{req.action_type}' requires parameter '{p}'."},
            )

    raw_text = source.raw_text or ""
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail={"error": "NO_CONTENT", "message": "Source has no content."})

    try:
        content = await actions_service.run_action(
            req.action_type, source.title, raw_text, params,
        )
    except Exception as e:
        logger.exception("Action '{}' failed: {}", req.action_type, str(e))
        raise HTTPException(status_code=503, detail={"error": "ACTION_FAILED", "message": f"Action '{req.action_type}' failed."})

    return ActionResponse(
        action_type=req.action_type,
        source_id=source.id,
        source_title=source.title,
        content=content,
    )
