import asyncio

from sqlalchemy import select

from smartfleet.db.models import Telemetry
from smartfleet.db.session import create_engine, create_session_factory, init_db, session_scope
from smartfleet.protocols.teltonika import parse_packet
from smartfleet.services.telemetry import DeviceAuthService, TelemetryService
from tests.test_teltonika import SAMPLE_CODEC8

IMEI = "123456789012345"


def test_save_teltonika_packet_to_sqlite() -> None:
    async def run() -> None:
        engine = create_engine("sqlite+aiosqlite:///:memory:")
        await init_db(engine)
        session_factory = create_session_factory(engine)

        async with session_scope(session_factory) as session:
            tracker = await DeviceAuthService(session, auto_register=True).authenticate_imei(IMEI)
            assert tracker is not None
            tracker_id = tracker.id

        packet = parse_packet(SAMPLE_CODEC8)
        async with session_scope(session_factory) as session:
            tracker = await DeviceAuthService(session).get_tracker(IMEI)
            assert tracker is not None
            saved = await TelemetryService(session).save_teltonika_packet(tracker, packet)
            assert saved == 1

        async with session_scope(session_factory) as session:
            result = await session.execute(
                select(Telemetry).where(Telemetry.tracker_id == tracker_id)
            )
            telemetry = result.scalar_one()
            assert telemetry.latitude == 0
            assert telemetry.longitude == 0
            assert telemetry.sensors["gsm_signal"] == 3
            assert telemetry.raw_io["241"] == 24602

        await engine.dispose()

    asyncio.run(run())
