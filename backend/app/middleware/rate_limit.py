from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import config

# Proxy-aware: uvicorn runs with --proxy-headers + --forwarded-allow-ips in
# production (docker-compose command), so get_remote_address() returns the real
# client IP from X-Forwarded-For set by nginx — not the proxy's own IP.
limiter = Limiter(
    key_func=get_remote_address,
    # Global safety net for every route (import polling needs headroom, so this
    # is deliberately generous — expensive LLM endpoints have stricter explicit
    # limits via @limiter.limit decorators).
    default_limits=[f"{int(config.get('requests_per_minute', 30)) * 4}/minute"],
)

