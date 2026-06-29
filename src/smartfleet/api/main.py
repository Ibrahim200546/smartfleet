from __future__ import annotations

import argparse
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from smartfleet.config import Settings, load_settings
from smartfleet.db.models import Telemetry, Tracker, Vehicle
from smartfleet.db.session import create_engine, create_session_factory, init_db
from smartfleet.services.telemetry import TelemetryService


class VehicleCreate(BaseModel):
    registration_number: str
    make: str | None = None
    model: str | None = None
    vin: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    registration_number: str
    make: str | None
    model: str | None
    vin: str | None
    status: str
    attributes: dict[str, Any]


class TrackerCreate(BaseModel):
    imei: str
    name: str | None = None
    device_type: str = "teltonika"
    protocol: str = "teltonika"
    vehicle_id: int | None = None
    is_allowed: bool = True
    settings: dict[str, Any] = Field(default_factory=dict)


class TrackerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    imei: str
    name: str | None
    device_type: str
    protocol: str
    vehicle_id: int | None
    is_allowed: bool
    is_online: bool
    last_seen_at: datetime | None
    settings: dict[str, Any]


class TelemetryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tracker_id: int
    vehicle_id: int | None
    timestamp: datetime
    received_at: datetime
    latitude: float | None
    longitude: float | None
    speed: float | None
    heading: float | None
    altitude: float | None
    satellites: int | None
    priority: int | None
    event_io_id: int | None
    generation_type: int | None
    codec: str | None
    sensors: dict[str, Any]
    raw_io: dict[str, Any]


def _epoch_ms(value: datetime | None) -> int:
    if value is None:
        return 0
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return int(value.timestamp() * 1000)


def _number_from_sensors(sensors: dict[str, Any], *keys: str, default: float = 0) -> float:
    for key in keys:
        value = sensors.get(key)
        if isinstance(value, bool):
            return 1 if value else 0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                continue
    return default


def _bool_from_sensors(sensors: dict[str, Any], *keys: str) -> bool:
    return _number_from_sensors(sensors, *keys, default=0) > 0


def _derive_status(telemetry: Telemetry | None, tracker: Tracker | None) -> str:
    if telemetry is None:
        return "offline"
    now = datetime.now(timezone.utc)
    timestamp = telemetry.timestamp
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    if (now - timestamp).total_seconds() > 30 * 60:
        return "offline"
    if telemetry.speed and telemetry.speed > 3:
        return "moving"
    if _bool_from_sensors(telemetry.sensors, "ignition", "digital_input"):
        return "idle"
    if tracker and not tracker.is_online:
        return "offline"
    return "parked"


def _snapshot_vehicle(
    *,
    vehicle: Vehicle | None,
    tracker: Tracker | None,
    telemetry: Telemetry | None,
) -> dict[str, Any]:
    sensors = telemetry.sensors if telemetry else {}
    latitude = telemetry.latitude if telemetry and telemetry.latitude is not None else 55.7522
    longitude = telemetry.longitude if telemetry and telemetry.longitude is not None else 37.6156
    vehicle_id = vehicle.id if vehicle else f"tracker-{tracker.id if tracker else 'unknown'}"
    registration = vehicle.registration_number if vehicle else tracker.imei if tracker else "—"
    name = " ".join(
        part
        for part in (vehicle.make if vehicle else None, vehicle.model if vehicle else None)
        if part
    )
    if not name:
        name = (
            vehicle.registration_number if vehicle else tracker.name if tracker else "Новый объект"
        )

    speed = telemetry.speed if telemetry and telemetry.speed is not None else 0
    heading = telemetry.heading if telemetry and telemetry.heading is not None else 0
    altitude = telemetry.altitude if telemetry and telemetry.altitude is not None else 0
    satellites = telemetry.satellites if telemetry and telemetry.satellites is not None else 0
    voltage_mv = _number_from_sensors(sensors, "external_voltage_mv", "battery_voltage_mv")

    return {
        "id": str(vehicle_id),
        "name": name,
        "plate": registration,
        "kind": vehicle.attributes.get("kind", "truck") if vehicle else "truck",
        "group": vehicle.attributes.get("group", "Без группы") if vehicle else "Без группы",
        "driver": None,
        "imei": tracker.imei if tracker else "",
        "tracker": tracker.name or tracker.imei if tracker else "Не назначен",
        "protocol": tracker.protocol if tracker else "unknown",
        "status": _derive_status(telemetry, tracker),
        "favorite": bool(vehicle.attributes.get("favorite", False)) if vehicle else False,
        "position": {"lat": latitude, "lng": longitude},
        "course": heading,
        "speed": speed,
        "odometer": _number_from_sensors(sensors, "total_odometer", "trip_odometer", default=0)
        / 1000,
        "address": vehicle.attributes.get("address", "Адрес не определён")
        if vehicle
        else "Адрес не определён",
        "lastUpdate": _epoch_ms(
            telemetry.timestamp if telemetry else tracker.last_seen_at if tracker else None
        ),
        "sensors": {
            "fuel": _number_from_sensors(sensors, "fuel", "fuel_level", default=0),
            "voltage": round(voltage_mv / 1000, 1) if voltage_mv > 100 else voltage_mv,
            "battery": _number_from_sensors(sensors, "battery", default=0),
            "temperature": _number_from_sensors(sensors, "temperature", default=0),
            "ignition": _bool_from_sensors(sensors, "ignition", "digital_input"),
            "satellites": satellites,
            "altitude": altitude,
        },
        "route": [{"lat": latitude, "lng": longitude}],
        "routeIndex": 0,
    }


async def _latest_tracker_telemetry(session: AsyncSession, tracker_id: int) -> Telemetry | None:
    result = await session.execute(
        select(Telemetry)
        .where(Telemetry.tracker_id == tracker_id)
        .order_by(desc(Telemetry.timestamp))
        .limit(1)
    )
    return result.scalar_one_or_none()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    engine = create_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await init_db(engine)
        app.state.session_factory = create_session_factory(engine)
        yield
        await engine.dispose()

    app = FastAPI(title="SmartFleet API", version="0.1.0", lifespan=lifespan)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
        session_factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/fleet/snapshot")
    async def fleet_snapshot(session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
        vehicles_result = await session.execute(
            select(Vehicle).order_by(Vehicle.registration_number)
        )
        vehicles = list(vehicles_result.scalars().all())
        trackers_result = await session.execute(select(Tracker).order_by(Tracker.imei))
        trackers = list(trackers_result.scalars().all())
        trackers_by_vehicle: dict[int, Tracker] = {
            tracker.vehicle_id: tracker for tracker in trackers if tracker.vehicle_id is not None
        }

        items: list[dict[str, Any]] = []
        used_tracker_ids: set[int] = set()
        for vehicle in vehicles:
            tracker = trackers_by_vehicle.get(vehicle.id)
            telemetry = await _latest_tracker_telemetry(session, tracker.id) if tracker else None
            if tracker:
                used_tracker_ids.add(tracker.id)
            items.append(_snapshot_vehicle(vehicle=vehicle, tracker=tracker, telemetry=telemetry))

        for tracker in trackers:
            if tracker.id in used_tracker_ids:
                continue
            telemetry = await _latest_tracker_telemetry(session, tracker.id)
            items.append(_snapshot_vehicle(vehicle=None, tracker=tracker, telemetry=telemetry))

        return {
            "source": "smartfleet-api",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "vehicles": items,
        }

    @app.post("/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
    async def create_vehicle(
        payload: VehicleCreate, session: AsyncSession = Depends(get_session)
    ) -> Vehicle:
        exists = await session.execute(
            select(Vehicle).where(Vehicle.registration_number == payload.registration_number)
        )
        if exists.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=409, detail="Vehicle registration number already exists"
            )
        vehicle = Vehicle(**payload.model_dump())
        session.add(vehicle)
        await session.flush()
        return vehicle

    @app.get("/vehicles", response_model=list[VehicleOut])
    async def list_vehicles(session: AsyncSession = Depends(get_session)) -> list[Vehicle]:
        result = await session.execute(select(Vehicle).order_by(Vehicle.registration_number))
        return list(result.scalars().all())

    @app.get("/vehicles/{vehicle_id}", response_model=VehicleOut)
    async def get_vehicle(vehicle_id: int, session: AsyncSession = Depends(get_session)) -> Vehicle:
        vehicle = await session.get(Vehicle, vehicle_id)
        if vehicle is None:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return vehicle

    @app.post("/trackers", response_model=TrackerOut, status_code=status.HTTP_201_CREATED)
    async def create_tracker(
        payload: TrackerCreate, session: AsyncSession = Depends(get_session)
    ) -> Tracker:
        exists = await session.execute(select(Tracker).where(Tracker.imei == payload.imei))
        if exists.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Tracker IMEI already exists")
        if (
            payload.vehicle_id is not None
            and await session.get(Vehicle, payload.vehicle_id) is None
        ):
            raise HTTPException(status_code=404, detail="Vehicle not found")
        tracker = Tracker(**payload.model_dump())
        session.add(tracker)
        await session.flush()
        return tracker

    @app.get("/trackers", response_model=list[TrackerOut])
    async def list_trackers(session: AsyncSession = Depends(get_session)) -> list[Tracker]:
        result = await session.execute(select(Tracker).order_by(Tracker.imei))
        return list(result.scalars().all())

    @app.get("/vehicles/{vehicle_id}/telemetry/latest", response_model=TelemetryOut | None)
    async def latest_vehicle_telemetry(
        vehicle_id: int, session: AsyncSession = Depends(get_session)
    ) -> Telemetry | None:
        if await session.get(Vehicle, vehicle_id) is None:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return await TelemetryService(session).latest_for_vehicle(vehicle_id)

    @app.get("/vehicles/{vehicle_id}/telemetry", response_model=list[TelemetryOut])
    async def vehicle_telemetry_history(
        vehicle_id: int,
        start: datetime = Query(...),
        end: datetime = Query(...),
        limit: int = Query(10_000, ge=1, le=100_000),
        session: AsyncSession = Depends(get_session),
    ) -> list[Telemetry]:
        if await session.get(Vehicle, vehicle_id) is None:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return await TelemetryService(session).history_for_vehicle(
            vehicle_id, start, end, limit=limit
        )

    @app.get("/trackers/{imei}/telemetry/latest", response_model=TelemetryOut | None)
    async def latest_tracker_telemetry(
        imei: str, session: AsyncSession = Depends(get_session)
    ) -> Telemetry | None:
        tracker_result = await session.execute(select(Tracker).where(Tracker.imei == imei))
        tracker = tracker_result.scalar_one_or_none()
        if tracker is None:
            raise HTTPException(status_code=404, detail="Tracker not found")
        telemetry_result = await session.execute(
            select(Telemetry)
            .where(Telemetry.tracker_id == tracker.id)
            .order_by(desc(Telemetry.timestamp))
            .limit(1)
        )
        return telemetry_result.scalar_one_or_none()

    return app


app = create_app()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run SmartFleet HTTP API")
    parser.add_argument("--host", default=None, help="API bind host")
    parser.add_argument("--port", type=int, default=None, help="API bind port")
    parser.add_argument("--log-level", default="info", help="Uvicorn log level")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    settings = load_settings()
    uvicorn.run(
        "smartfleet.api.main:app",
        host=args.host or settings.api_host,
        port=args.port or settings.api_port,
        log_level=args.log_level,
    )


if __name__ == "__main__":
    main()
