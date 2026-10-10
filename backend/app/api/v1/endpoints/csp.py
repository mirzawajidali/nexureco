import json
import logging

from fastapi import APIRouter, Request, Response

logger = logging.getLogger("csp")

router = APIRouter(prefix="/csp-report", tags=["Security"])


@router.post("", include_in_schema=False)
async def csp_report(request: Request):
    """Log Content-Security-Policy violations reported by browsers (report-uri in frontend/nginx/storefront.conf).

    While the policy is Report-Only, these logs show what enforcing it would block.
    """
    body = await request.body()
    try:
        report = json.loads(body[:10_000]).get("csp-report", {})
    except (ValueError, AttributeError):
        return Response(status_code=204)
    logger.warning(
        "CSP violation: %s blocked %s on %s",
        report.get("effective-directive") or report.get("violated-directive"),
        report.get("blocked-uri"),
        report.get("document-uri"),
    )
    return Response(status_code=204)
