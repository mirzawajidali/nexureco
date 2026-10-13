"""Store settings the owner changes in Admin > Settings, with the coded defaults from core/store.py.

Only these keys exist: checkout, the cart/checkout pages, the top bar, the free-shipping progress bar,
the product feed and the server-rendered pages all read them from here, so a change applies everywhere.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.store import FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST, format_price
from app.db.redis import CacheService
from app.models.settings import StoreSetting

# setting key -> (default, kind). New key names on purpose: rows saved by the old settings page
# (shipping_free_threshold = 0, an outdated announcement, ...) are ignored, so they can't zero shipping.
EDITABLE: dict[str, tuple[int | str, str]] = {
    "checkout_free_shipping_from": (FREE_SHIPPING_THRESHOLD, "number"),
    "checkout_shipping_charge": (STANDARD_SHIPPING_COST, "number"),
    "top_bar_announcement": ("", "string"),
}
LABELS = {
    "checkout_free_shipping_from": "Free shipping from",
    "checkout_shipping_charge": "Shipping charge",
    "top_bar_announcement": "Announcement text",
}
MAX_AMOUNT = 1_000_000
MAX_ANNOUNCEMENT = 200

_CACHE_KEY = f"{CacheService.PREFIX}:store-settings"
_CACHE_TTL = 300


def parse_setting(key: str, raw: object) -> int | str:
    """A submitted value as stored; raises ValueError with a readable message when it's not valid."""
    default, kind = EDITABLE[key]
    text = "" if raw is None else str(raw).strip()
    if kind == "number":
        try:
            amount = int(float(text.replace(",", "")))
        except ValueError:
            raise ValueError(f"{LABELS[key]} must be a whole number of rupees") from None
        if not 0 <= amount <= MAX_AMOUNT:
            raise ValueError(f"{LABELS[key]} must be between 0 and {MAX_AMOUNT:,}")
        return amount
    if len(text) > MAX_ANNOUNCEMENT:
        raise ValueError(f"The announcement can be at most {MAX_ANNOUNCEMENT} characters")
    return text


async def get_store_settings(db: AsyncSession) -> dict[str, int | str]:
    """Current values of the editable settings (stored value, else the default)."""
    cached = await CacheService.get(_CACHE_KEY)
    if cached:
        return cached

    values: dict[str, int | str] = {key: default for key, (default, _) in EDITABLE.items()}
    rows = (await db.execute(select(StoreSetting).where(StoreSetting.setting_key.in_(list(EDITABLE))))).scalars()
    for row in rows:
        try:
            values[row.setting_key] = parse_setting(row.setting_key, row.setting_value)
        except ValueError:
            pass  # an old invalid value: keep the default
    await CacheService.set(_CACHE_KEY, values, _CACHE_TTL)
    return values


async def save_store_settings(db: AsyncSession, data: dict[str, object]) -> dict[str, int | str]:
    """Validate and save the submitted editable settings; unknown keys are refused."""
    unknown = sorted(set(data) - set(EDITABLE))
    if unknown:
        raise ValueError(f"Unknown setting: {', '.join(unknown)}")
    parsed = {key: parse_setting(key, value) for key, value in data.items()}

    existing = {
        row.setting_key: row
        for row in (await db.execute(select(StoreSetting).where(StoreSetting.setting_key.in_(list(parsed))))).scalars()
    }
    for key, value in parsed.items():
        kind = EDITABLE[key][1]
        row = existing.get(key)
        if row is None:
            db.add(StoreSetting(setting_key=key, setting_value=str(value), setting_type=kind))
        else:
            row.setting_value = str(value)
            row.setting_type = kind
    # Saved before the cache is cleared, so a request in between can't re-cache the old values
    await db.commit()
    await CacheService.delete(_CACHE_KEY)
    return await get_store_settings(db)


def shipping_cost_for(subtotal: float, settings: dict[str, int | str]) -> int:
    """Same rule everywhere: free from the threshold (on the subtotal before any discount), else the flat rate."""
    return 0 if subtotal >= int(settings["checkout_free_shipping_from"]) else int(settings["checkout_shipping_charge"])


def free_shipping_phrase(free_from: int) -> str:
    """'free shipping on orders of Rs. 5,000 or more', or 'free shipping on all orders' when the threshold is 0."""
    return f"free shipping on orders of {format_price(free_from)} or more" if free_from > 0 else "free shipping on all orders"
