"""Bundle deal: any BUNDLE_SIZE tees for BUNDLE_PRICE. Mirrored by frontend/src/utils/bundles.ts — keep in sync.

The most expensive items are grouped first, and a set is only discounted when the bundle price is
lower than its normal total, so the deal can never make anything cost more. Every product currently
counts as a tee; change is_bundle_eligible() if non-tee products are added.
"""
from dataclasses import dataclass

BUNDLE_SIZE = 3
BUNDLE_PRICE = 3500


def is_bundle_eligible(product) -> bool:  # noqa: ARG001 - kept as the one place to narrow the deal
    return True


@dataclass
class BundleResult:
    sets: int  # complete bundles in the order
    discount: float  # total saving across all sets
    items_to_next_set: int  # how many more eligible items complete the next bundle


def bundle_discount(unit_prices: list[float]) -> BundleResult:
    """Saving for eligible items, given one entry per unit (a line of quantity 2 appears twice)."""
    prices = sorted(unit_prices, reverse=True)
    sets = len(prices) // BUNDLE_SIZE
    discount = 0.0
    for i in range(sets):
        group_total = sum(prices[i * BUNDLE_SIZE:(i + 1) * BUNDLE_SIZE])
        discount += max(0.0, group_total - BUNDLE_PRICE)
    remainder = len(prices) % BUNDLE_SIZE
    return BundleResult(
        sets=sets,
        discount=round(discount, 2),
        items_to_next_set=BUNDLE_SIZE - remainder if prices else BUNDLE_SIZE,
    )
