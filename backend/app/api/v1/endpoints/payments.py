from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.services import payfast_service

router = APIRouter(prefix="/payments", tags=["Payments"])
settings = get_settings()


@router.get("/methods")
async def payment_methods():
    """Payment methods checkout offers: cash on delivery, plus PayFast once it's configured."""
    return {"methods": ["cod", "payfast"] if settings.payfast_enabled else ["cod"]}


class StartPayment(BaseModel):
    order_number: str = Field(min_length=3, max_length=30)


@router.post("/payfast/start")
async def start_payfast(data: StartPayment, db: AsyncSession = Depends(get_db)):
    """Form fields the browser posts to PayFast's hosted payment page for a just-placed order."""
    return await payfast_service.start_payment(db, data.order_number)


async def _params(request: Request) -> dict:
    params = dict(request.query_params)
    if request.method == "POST":
        params.update({k: v for k, v in (await request.form()).items() if isinstance(v, str)})
    return params


@router.api_route("/payfast/return", methods=["GET", "POST"], include_in_schema=False)
async def payfast_return(request: Request, db: AsyncSession = Depends(get_db)):
    """Where PayFast sends the customer back (SUCCESS_URL / FAILURE_URL): apply the result, show the order."""
    order, paid = await payfast_service.handle_callback(db, await _params(request))
    if not order:
        return RedirectResponse("/checkout?payment=failed", status_code=303)
    return RedirectResponse(
        f"/order-confirmation/{order.order_number}?payment={'paid' if paid else 'failed'}", status_code=303
    )


@router.api_route("/payfast/ipn", methods=["GET", "POST"], include_in_schema=False)
async def payfast_ipn(request: Request, db: AsyncSession = Depends(get_db)):
    """PayFast's server-to-server notification (CHECKOUT_URL)."""
    order, paid = await payfast_service.handle_callback(db, await _params(request))
    return {"received": order is not None, "paid": paid}
