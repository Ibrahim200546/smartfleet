from __future__ import annotations

import argparse
import asyncio
import logging
from contextlib import suppress

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from smartfleet.config import Settings, load_settings
from smartfleet.db.session import create_engine, create_session_factory, init_db, session_scope
from smartfleet.protocols.teltonika import TeltonikaProtocolError, parse_packet
from smartfleet.services.telemetry import DeviceAuthService, TelemetryService

LOGGER = logging.getLogger("smartfleet.tcp")
MAX_IMEI_LENGTH = 32
MAX_DATA_FIELD_LENGTH = 1024 * 1024


async def _read_exactly(reader: asyncio.StreamReader, size: int, timeout_seconds: float) -> bytes:
    return await asyncio.wait_for(reader.readexactly(size), timeout=timeout_seconds)


async def _read_imei(reader: asyncio.StreamReader, timeout_seconds: float) -> str:
    length = int.from_bytes(await _read_exactly(reader, 2, timeout_seconds), "big")
    if length <= 0 or length > MAX_IMEI_LENGTH:
        raise ValueError(f"Invalid IMEI length: {length}")
    raw_imei = await _read_exactly(reader, length, timeout_seconds)
    imei = raw_imei.decode("ascii")
    if not imei.isdigit():
        raise ValueError(f"IMEI must contain digits only: {imei!r}")
    return imei


async def _send(writer: asyncio.StreamWriter, payload: bytes) -> None:
    writer.write(payload)
    await writer.drain()


async def handle_teltonika_client(
    reader: asyncio.StreamReader,
    writer: asyncio.StreamWriter,
    *,
    session_factory: async_sessionmaker[AsyncSession],
    settings: Settings,
) -> None:
    peer = writer.get_extra_info("peername")
    LOGGER.info("Tracker connected: %s", peer)
    imei: str | None = None

    try:
        imei = await _read_imei(reader, settings.tcp_read_timeout_seconds)
        async with session_scope(session_factory) as session:
            tracker = await DeviceAuthService(
                session, auto_register=settings.auto_register_trackers
            ).authenticate_imei(imei)
            authorized = tracker is not None

        await _send(writer, b"\x01" if authorized else b"\x00")
        if not authorized:
            LOGGER.warning("Rejected IMEI %s from %s", imei, peer)
            return

        LOGGER.info("Accepted IMEI %s from %s", imei, peer)
        while True:
            try:
                preamble = await _read_exactly(reader, 4, settings.tcp_read_timeout_seconds)
            except asyncio.IncompleteReadError:
                break

            length_bytes = await _read_exactly(reader, 4, settings.tcp_read_timeout_seconds)
            data_length = int.from_bytes(length_bytes, "big")
            if data_length <= 0 or data_length > MAX_DATA_FIELD_LENGTH:
                raise TeltonikaProtocolError(f"Invalid data field length: {data_length}")

            data = await _read_exactly(reader, data_length, settings.tcp_read_timeout_seconds)
            crc = await _read_exactly(reader, 4, settings.tcp_read_timeout_seconds)
            raw_packet = preamble + length_bytes + data + crc

            try:
                packet = parse_packet(raw_packet)
            except TeltonikaProtocolError as exc:
                LOGGER.warning("Invalid Teltonika packet from %s (%s): %s", peer, imei, exc)
                await _send(writer, b"\x00\x00\x00\x00")
                continue

            async with session_scope(session_factory) as session:
                tracker = await DeviceAuthService(session).get_tracker(imei)
                if tracker is None or not tracker.is_allowed:
                    await _send(writer, b"\x00\x00\x00\x00")
                    LOGGER.warning("Tracker disappeared or disabled during session: %s", imei)
                    return
                saved = await TelemetryService(session).save_teltonika_packet(tracker, packet)

            await _send(writer, saved.to_bytes(4, "big"))
            LOGGER.info("Saved %s AVL record(s) for IMEI %s", saved, imei)

    except (asyncio.TimeoutError, ConnectionResetError, BrokenPipeError) as exc:
        LOGGER.info("Tracker connection closed: peer=%s imei=%s reason=%s", peer, imei, exc)
    except Exception:
        LOGGER.exception("Unhandled tracker connection error: peer=%s imei=%s", peer, imei)
    finally:
        writer.close()
        with suppress(Exception):
            await writer.wait_closed()
        LOGGER.info("Tracker disconnected: peer=%s imei=%s", peer, imei)


async def run_tcp_server(settings: Settings | None = None) -> None:
    settings = settings or load_settings()
    engine = create_engine(settings.database_url)
    await init_db(engine)
    session_factory = create_session_factory(engine)

    server = await asyncio.start_server(
        lambda reader, writer: handle_teltonika_client(
            reader, writer, session_factory=session_factory, settings=settings
        ),
        host=settings.tcp_host,
        port=settings.tcp_port,
        reuse_address=True,
    )

    addresses = ", ".join(str(sock.getsockname()) for sock in server.sockets or [])
    LOGGER.info("SmartFleet TCP server listening on %s", addresses)
    async with server:
        await server.serve_forever()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run SmartFleet Teltonika TCP ingestion server")
    parser.add_argument("--host", default=None, help="TCP bind host")
    parser.add_argument("--port", type=int, default=None, help="TCP bind port")
    parser.add_argument("--database-url", default=None, help="SQLAlchemy database URL")
    parser.add_argument("--log-level", default="INFO", help="Python logging level")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO))
    base_settings = load_settings()
    settings = Settings(
        database_url=args.database_url or base_settings.database_url,
        tcp_host=args.host or base_settings.tcp_host,
        tcp_port=args.port or base_settings.tcp_port,
        tcp_read_timeout_seconds=base_settings.tcp_read_timeout_seconds,
        auto_register_trackers=base_settings.auto_register_trackers,
        api_host=base_settings.api_host,
        api_port=base_settings.api_port,
        cors_origins=base_settings.cors_origins,
    )
    asyncio.run(run_tcp_server(settings))


if __name__ == "__main__":
    main()
