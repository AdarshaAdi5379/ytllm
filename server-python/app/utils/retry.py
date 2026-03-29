import asyncio
from typing import TypeVar, Callable, Any

T = TypeVar("T")


async def retry(
    fn: Callable[..., T],
    max_attempts: int = 3,
    base_delay_ms: int = 1000,
    *args: Any,
    **kwargs: Any,
) -> T:
    """Exponential backoff retry wrapper for async operations."""
    last_error = None

    for attempt in range(1, max_attempts + 1):
        try:
            if asyncio.iscoroutinefunction(fn):
                return await fn(*args, **kwargs)
            else:
                return fn(*args, **kwargs)
        except Exception as err:
            last_error = err

            # Safely check for client errors (don't retry)
            status = getattr(err, "status", None)
            if not status and hasattr(err, "response"):
                try:
                    resp = getattr(err, "response")
                    if hasattr(resp, "get"):
                        status = resp.get("status")
                    elif hasattr(resp, "status_code"):
                        status = resp.status_code
                    elif hasattr(resp, "status"):
                        status = resp.status
                except Exception:
                    pass
            is_client_error = status and status in [400, 401, 404]

            # Check for rate limits
            err_msg = str(err).lower()
            is_rate_limit = (
                "429" in err_msg
                or "rate limit" in err_msg
                or "quota" in err_msg
                or status == 403
            )

            if is_client_error and not is_rate_limit:
                print(f"Client error {status} encountered, aborting retries: {err}")
                break

            if attempt < max_attempts:
                if is_rate_limit:
                    delay = base_delay_ms * (2 ** (attempt - 1))
                    print(
                        f"Rate limit hit. Retrying in {delay}ms (attempt {attempt}/{max_attempts})"
                    )
                else:
                    delay = base_delay_ms * attempt
                    print(
                        f"Request failed. Retrying in {delay}ms (attempt {attempt}/{max_attempts}): {err}"
                    )
                await asyncio.sleep(delay / 1000)
            else:
                break

    raise last_error


def sleep(ms: int) -> asyncio.sleep:
    """Sleep for the specified milliseconds."""
    return asyncio.sleep(ms / 1000)
