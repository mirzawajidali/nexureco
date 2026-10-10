"""Store-wide constants. The storefront mirrors these in frontend/src/utils/constants.ts — keep them in sync."""

SITE_NAME = "Nexure CO"
TAGLINE = "Premium Fashion & Apparel"
DEFAULT_DESCRIPTION = (
    "Nexure CO - premium fashion & apparel. Shop new arrivals, best sellers and everyday essentials."
)
CURRENCY = "PKR"

STORE_EMAIL = "support@nexureco.com"
STORE_PHONE = "+92 316 7936302"
STORE_ADDRESS = "Nexure Co, Ferozepur Road, Ichhra, Lahore"
STORE_HOURS = "Mon - Sat, 10am - 8pm PKT"

# Orders with a subtotal at or above the threshold ship free; others pay the standard rate
FREE_SHIPPING_THRESHOLD = 5000
STANDARD_SHIPPING_COST = 200
# Returns/exchanges accepted within this many days of delivery (also stated on the Shipping & Returns page)
RETURN_WINDOW_DAYS = 7


def format_price(amount: float) -> str:
    """Same output as formatPrice() in frontend/src/utils/formatters.ts, e.g. 'Rs. 1,320'."""
    return f"Rs. {int(amount + 0.5):,}"
