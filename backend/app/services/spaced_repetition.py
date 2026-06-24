"""SM-2 spaced repetition algorithm implementation."""

from datetime import datetime, timedelta


RATING_MAP = {
    0: 0,  # Again → 0
    1: 1,  # Hard → 1
    2: 3,  # Good → 3
    3: 4,  # Easy → 4
}


def calculate_next_review(
    rating: int,
    easiness_factor: float,
    interval_days: int,
    repetitions: int,
) -> dict:
    """Apply SM-2 algorithm and return updated scheduling values.

    Args:
        rating: User rating (0=again, 1=hard, 2=good, 3=easy).
        easiness_factor: Current easiness factor (default 2.5).
        interval_days: Current interval in days.
        repetitions: Number of consecutive correct reviews.

    Returns:
        dict with keys: easiness_factor, interval_days, repetitions, next_review_date
    """
    q = RATING_MAP.get(rating, 0)

    if q < 3:
        repetitions = 0
        interval_days = 1
    else:
        ef = easiness_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        if ef < 1.3:
            ef = 1.3
        easiness_factor = ef

        if repetitions == 0:
            interval_days = 1
        elif repetitions == 1:
            interval_days = 3
        else:
            interval_days = round(interval_days * easiness_factor)

        repetitions += 1

    next_review = datetime.utcnow() + timedelta(days=interval_days)
    is_correct = q >= 3

    return {
        "easiness_factor": easiness_factor,
        "interval_days": interval_days,
        "repetitions": repetitions,
        "next_review_date": next_review,
        "is_correct": is_correct,
    }
