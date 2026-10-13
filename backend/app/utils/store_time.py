"""Pakistan time (UTC+5, no daylight saving) for reports: what "today" and "this month" mean to the store.

Timestamps are stored in UTC, so a Pakistan day runs 19:00-19:00 UTC. Filtering with plain UTC ranges
(rather than wrapping the column in DATE()) also lets MySQL use the created_at index.
"""
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, literal_column

STORE_UTC_OFFSET = timedelta(hours=5)
STORE_TZ = timezone(STORE_UTC_OFFSET, "PKT")


def store_today() -> date:
    return datetime.now(STORE_TZ).date()


def day_start_utc(day: date) -> datetime:
    """Midnight Pakistan time on ``day``, as the naive UTC datetime the database stores."""
    return datetime.combine(day, time()) - STORE_UTC_OFFSET


def utc_range(first_day: date, last_day: date) -> tuple[datetime, datetime]:
    """[start, end) in UTC covering the Pakistan days first_day..last_day inclusive."""
    return day_start_utc(first_day), day_start_utc(last_day + timedelta(days=1))


def add_months(day: date, months: int) -> date:
    """The first of the month ``months`` months from ``day``'s month."""
    index = day.year * 12 + (day.month - 1) + months
    return date(index // 12, index % 12 + 1, 1)


def in_store_time(column):
    """SQL: a UTC datetime column shifted to Pakistan time (for grouping by local day, month or hour)."""
    return func.date_add(column, literal_column("INTERVAL 5 HOUR"))
