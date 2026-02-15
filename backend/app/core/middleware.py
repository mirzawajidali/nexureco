import time
from collections import defaultdict
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from app.config import get_settings


# ---------------------------------------------------------------------------
# Rate Limiting (in-memory, per-IP, multi-tier)
# ---------------------------------------------------------------------------

# (path_prefix, method_or_None, limit_per_minute)
# Checked top-to-bottom — first match wins. Most specific routes go first.
_RATE_RULES: list[tuple[str, str | None, int]] = [
    # Auth — strict limits on abuse-prone endpoints
    ("/api/v1/auth/login",            "POST", 10),
    ("/api/v1/auth/register",         "POST", 5),
    ("/api/v1/auth/forgot-password",  "POST", 5),
    ("/api/v1/auth/reset-password",   "POST", 5),
    ("/api/v1/auth/verify-email",     "POST", 10),
    ("/api/v1/auth/resend-otp",       "POST", 3),
    ("/api/v1/auth/refresh",          "POST", 30),
    # Auth catch-all
    ("/api/v1/auth/",                 None,   20),

    # Chatbot — moderate limit for AI responses
    ("/api/v1/chat/",                 "POST", 20),

    # Storefront — spam-prone public write endpoints
    ("/api/v1/orders/checkout",       "POST", 10),
    ("/api/v1/orders/track",          "POST", 15),
    ("/api/v1/contact",               "POST", 5),
    ("/api/v1/newsletter/subscribe",  "POST", 5),
    ("/api/v1/reviews",               "POST", 10),

    # Admin — higher limits for authenticated work
    ("/api/v1/admin/",                None,   200),
]

# Fallback general limit is read from settings (default 100/min)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory sliding-window rate limiter with per-route tiers.

    Each (ip, bucket_key) pair is tracked independently so that e.g. login
    attempts don't eat into the general request budget.

    Memory is bounded: stale entries are pruned on every request.
    """

    WINDOW = 60  # seconds

    def __init__(self, app: FastAPI) -> None:
        super().__init__(app)
        # {(ip, bucket_key): [timestamp, ...]}
        self._buckets: dict[tuple[str, str], list[float]] = defaultdict(list)
        settings = get_settings()
        self._general_limit = settings.RATE_LIMIT_PER_MINUTE

    @staticmethod
    def _match_rule(path: str, method: str) -> tuple[str, int] | None:
        """Return (bucket_key, limit) for the first matching rule, or None."""
        for prefix, rule_method, limit in _RATE_RULES:
            if path.startswith(prefix) or path.rstrip("/").startswith(prefix.rstrip("/")):
                if rule_method is None or rule_method == method:
                    return (prefix, limit)
        return None

    def _prune(self, key: tuple[str, str], now: float) -> None:
        cutoff = now - self.WINDOW
        self._buckets[key] = [ts for ts in self._buckets[key] if ts > cutoff]
        if not self._buckets[key]:
            del self._buckets[key]

    def _retry_after(self, timestamps: list[float], now: float) -> int:
        if not timestamps:
            return 1
        oldest = min(timestamps)
        return max(1, int(self.WINDOW - (now - oldest)) + 1)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip rate limiting for non-API paths (static files, health checks)
        path = request.url.path
        if not path.startswith("/api/"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        now = time.time()

        # --- Check route-specific limit ---
        match = self._match_rule(path, method)
        if match:
            bucket_key, limit = match
            route_key = (client_ip, bucket_key)
            self._prune(route_key, now)

            if len(self._buckets[route_key]) >= limit:
                retry = self._retry_after(self._buckets[route_key], now)
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Too many requests. Please slow down and try again later."},
                    headers={"Retry-After": str(retry)},
                )
            self._buckets[route_key].append(now)

        # --- Check general IP-wide limit ---
        general_key = (client_ip, "__general__")
        self._prune(general_key, now)

        if len(self._buckets[general_key]) >= self._general_limit:
            retry = self._retry_after(self._buckets[general_key], now)
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again later."},
                headers={"Retry-After": str(retry)},
            )
        self._buckets[general_key].append(now)

        return await call_next(request)


# ---------------------------------------------------------------------------
# Request Timing
# ---------------------------------------------------------------------------

class RequestTimingMiddleware(BaseHTTPMiddleware):
    """Adds an ``X-Process-Time`` header (in seconds) to every response."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        response.headers["X-Process-Time"] = f"{elapsed:.4f}"
        return response


# ---------------------------------------------------------------------------
# Setup helper – called from main.py
# ---------------------------------------------------------------------------

def setup_middleware(app: FastAPI) -> None:
    settings = get_settings()

    # --- Order matters: outermost middleware is added last ---

    # 1. CORS (outermost – must run before everything else)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Trusted Host
    #    When TRUSTED_HOSTS is "*" we allow all hosts (wildcard is the
    #    TrustedHostMiddleware default for "allow everything").
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.trusted_hosts_list,
    )

    # 3. Rate limiting
    app.add_middleware(RateLimitMiddleware)

    # 4. Request timing (innermost – wraps the actual route handler)
    app.add_middleware(RequestTimingMiddleware)
