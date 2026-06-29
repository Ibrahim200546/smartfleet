from __future__ import annotations

import os
from dataclasses import dataclass

from smartfleet.db.session import DEFAULT_DATABASE_URL


@dataclass(frozen=True)
class Settings:
    database_url: str = DEFAULT_DATABASE_URL
    tcp_host: str = "0.0.0.0"
    tcp_port: int = 5027
    tcp_read_timeout_seconds: float = 60.0
    auto_register_trackers: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: tuple[str, ...] = (
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    )


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def _csv_env(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    raw = os.getenv(name)
    if raw is None:
        return default
    return tuple(item.strip() for item in raw.split(",") if item.strip())


def load_settings() -> Settings:
    return Settings(
        database_url=os.getenv("SMARTFLEET_DATABASE_URL", DEFAULT_DATABASE_URL),
        tcp_host=os.getenv("SMARTFLEET_TCP_HOST", "0.0.0.0"),
        tcp_port=int(os.getenv("SMARTFLEET_TCP_PORT", "5027")),
        tcp_read_timeout_seconds=float(os.getenv("SMARTFLEET_TCP_READ_TIMEOUT_SECONDS", "60")),
        auto_register_trackers=_bool_env("SMARTFLEET_AUTO_REGISTER_TRACKERS", True),
        api_host=os.getenv("SMARTFLEET_API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("SMARTFLEET_API_PORT", "8000")),
        cors_origins=_csv_env(
            "SMARTFLEET_CORS_ORIGINS",
            ("http://localhost:3000", "http://127.0.0.1:3000"),
        ),
    )
