from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol


class QuicklinkProtocolError(ValueError):
    """Raised when a Quicklink frame cannot be decoded."""


@dataclass(frozen=True)
class QuicklinkTelemetry:
    imei: str
    timestamp: datetime
    latitude: float
    longitude: float
    speed: float | None = None
    heading: float | None = None
    altitude: float | None = None
    satellites: int | None = None
    sensors: dict[str, Any] | None = None


class QuicklinkDecoder(Protocol):
    """Implement this protocol when the vendor provides the exact Quicklink packet format."""

    def decode(self, frame: bytes) -> list[QuicklinkTelemetry]:
        """Decode one complete Quicklink frame into telemetry records."""
        ...


class UnsupportedQuicklinkDecoder:
    """Explicit placeholder: Quicklink is vendor-specific and must not be guessed."""

    def decode(self, _frame: bytes) -> list[QuicklinkTelemetry]:
        raise QuicklinkProtocolError(
            "Quicklink packet format is not configured. Add a vendor-specific decoder with "
            + "IMEI extraction, field parsing and checksum validation."
        )
