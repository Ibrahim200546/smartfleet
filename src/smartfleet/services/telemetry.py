from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from smartfleet.db.models import Telemetry, Tracker
from smartfleet.protocols.teltonika import TeltonikaPacket


class DeviceAuthService:
    def __init__(self, session: AsyncSession, *, auto_register: bool = True):
        self.session = session
        self.auto_register = auto_register

    async def authenticate_imei(self, imei: str) -> Tracker | None:
        tracker = await self.get_tracker(imei)
        now = datetime.now(timezone.utc)

        if tracker is None:
            if not self.auto_register:
                return None
            tracker = Tracker(imei=imei, name=f"Tracker {imei}", protocol="teltonika")
            self.session.add(tracker)
            await self.session.flush()

        if not tracker.is_allowed:
            return None

        tracker.is_online = True
        tracker.last_seen_at = now
        tracker.updated_at = now
        await self.session.flush()
        return tracker

    async def get_tracker(self, imei: str) -> Tracker | None:
        result = await self.session.execute(select(Tracker).where(Tracker.imei == imei))
        return result.scalar_one_or_none()


class TelemetryService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_teltonika_packet(self, tracker: Tracker, packet: TeltonikaPacket) -> int:
        saved = 0
        for record in packet.records:
            telemetry = Telemetry(
                tracker_id=tracker.id,
                vehicle_id=tracker.vehicle_id,
                timestamp=record.timestamp,
                latitude=record.gps.latitude,
                longitude=record.gps.longitude,
                speed=record.gps.speed,
                heading=record.gps.heading,
                altitude=record.gps.altitude,
                satellites=record.gps.satellites,
                priority=record.priority,
                event_io_id=record.event_io_id,
                generation_type=record.generation_type,
                codec=packet.codec_name,
                sensors=record.io_by_name(),
                raw_io=record.io_raw(),
            )
            self.session.add(telemetry)
            saved += 1

        tracker.last_seen_at = datetime.now(timezone.utc)
        tracker.is_online = True
        await self.session.flush()
        return saved

    async def latest_for_vehicle(self, vehicle_id: int) -> Telemetry | None:
        result = await self.session.execute(
            select(Telemetry)
            .where(Telemetry.vehicle_id == vehicle_id)
            .order_by(desc(Telemetry.timestamp))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def history_for_vehicle(
        self, vehicle_id: int, start: datetime, end: datetime, *, limit: int = 10_000
    ) -> list[Telemetry]:
        result = await self.session.execute(
            select(Telemetry)
            .where(
                Telemetry.vehicle_id == vehicle_id,
                Telemetry.timestamp >= start,
                Telemetry.timestamp <= end,
            )
            .order_by(Telemetry.timestamp)
            .limit(limit)
        )
        return list(result.scalars().all())
