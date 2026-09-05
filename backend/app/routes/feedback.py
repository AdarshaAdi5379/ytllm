from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import Feedback
from app.models import FeedbackRequest, FeedbackResponse
from app.services.auth_service import get_optional_user
from app.middleware.rate_limit import limiter
from app.db_models import User

router = APIRouter()


@router.post("/", response_model=FeedbackResponse, status_code=201)
@limiter.limit("5/minute")
async def submit_feedback(
    request: Request,
    body: FeedbackRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    feedback = Feedback(
        message=body.message,
        feature_want=body.feature_want,
        like_most=body.like_most,
        could_improve=body.could_improve,
        feedback_type=body.feedback_type,
        rating=body.rating,
        email=body.email,
        user_id=user.id if user else None,
        guest_token=body.guest_token if not user else None,
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    return FeedbackResponse(
        id=feedback.id,
        message=feedback.message,
        feedback_type=feedback.feedback_type,
        rating=feedback.rating,
        created_at=feedback.created_at.isoformat(),
    )
