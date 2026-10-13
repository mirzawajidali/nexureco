"""CSV downloads for the admin (orders, products), safe to open in Excel."""
import csv
import io
from collections.abc import Iterable

from fastapi.responses import StreamingResponse

# A cell starting with one of these is run as a formula by Excel/Sheets (=HYPERLINK(...), +cmd, ...):
# customer-typed text such as names must not be able to do that
_FORMULA_START = ("=", "+", "-", "@", "\t", "\r")


def safe_cell(value: object) -> object:
    if isinstance(value, str) and value.startswith(_FORMULA_START):
        return "'" + value
    return value


def _line(row: Iterable[object]) -> str:
    buf = io.StringIO()
    csv.writer(buf).writerow([safe_cell(v) for v in row])
    return buf.getvalue()


def csv_download(filename: str, header: list[str], rows: Iterable[Iterable[object]]) -> StreamingResponse:
    """A CSV file of ``rows`` under ``header``. The rows are collected by the endpoint first (the database
    session closes when it returns); the BOM makes Excel read the file as UTF-8 (Urdu names)."""
    lines = ["﻿" + _line(header), *(_line(row) for row in rows)]
    return StreamingResponse(
        iter(lines),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
