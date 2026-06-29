from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal


class TeltonikaProtocolError(ValueError):
    """Raised when a Teltonika packet is malformed or fails integrity checks."""


CodecName = Literal["codec8", "codec8_extended", "codec16"]


CODEC_8 = 0x08
CODEC_8_EXTENDED = 0x8E
CODEC_16 = 0x10


AVL_ID_NAMES: dict[int, str] = {
    1: "digital_input",
    2: "digital_output",
    9: "analog_input_1",
    10: "sd_status",
    11: "iccid_1",
    16: "total_odometer",
    21: "gsm_signal",
    24: "speed",
    66: "external_voltage_mv",
    67: "battery_voltage_mv",
    68: "battery_current_ma",
    69: "gnss_status",
    80: "data_mode",
    179: "digital_output_1",
    180: "digital_output_2",
    181: "pdop",
    182: "hdop",
    199: "trip_odometer",
    200: "sleep_mode",
    239: "ignition",
    240: "movement",
    241: "active_gsm_operator",
}


@dataclass(frozen=True)
class GpsElement:
    longitude: float
    latitude: float
    altitude: int
    heading: int
    satellites: int
    speed: int


@dataclass(frozen=True)
class IoElement:
    avl_id: int
    value: int | bytes
    size: int

    @property
    def name(self) -> str:
        return AVL_ID_NAMES.get(self.avl_id, f"avl_{self.avl_id}")

    def json_value(self) -> int | str:
        if isinstance(self.value, bytes):
            return self.value.hex()
        return self.value


@dataclass(frozen=True)
class AvlRecord:
    timestamp_ms: int
    priority: int
    gps: GpsElement
    event_io_id: int
    total_io_count: int
    io_elements: dict[int, IoElement]
    generation_type: int | None = None

    @property
    def timestamp(self) -> datetime:
        return datetime.fromtimestamp(self.timestamp_ms / 1000, tz=timezone.utc)

    def io_by_name(self) -> dict[str, int | str]:
        return {element.name: element.json_value() for element in self.io_elements.values()}

    def io_raw(self) -> dict[str, int | str]:
        return {str(avl_id): element.json_value() for avl_id, element in self.io_elements.items()}


@dataclass(frozen=True)
class TeltonikaPacket:
    codec_id: int
    codec_name: CodecName
    records: list[AvlRecord]
    declared_record_count: int
    crc: int
    raw_data: bytes = field(repr=False)

    @property
    def ack(self) -> bytes:
        """TCP acknowledgement: number of accepted AVL records as a 4-byte integer."""
        return len(self.records).to_bytes(4, "big")


@dataclass(frozen=True)
class _CodecConfig:
    name: CodecName
    io_id_size: int
    io_count_size: int
    count_size: int
    has_generation_type: bool = False
    has_variable_io: bool = False


_CODEC_8_CONFIG = _CodecConfig("codec8", io_id_size=1, io_count_size=1, count_size=1)
_CODEC_8_EXT_CONFIG = _CodecConfig(
    "codec8_extended", io_id_size=2, io_count_size=2, count_size=1, has_variable_io=True
)
_CODEC_16_CONFIGS = (
    # Teltonika Codec 16 documentation commonly uses a 1-byte record count.
    _CodecConfig("codec16", io_id_size=2, io_count_size=2, count_size=1, has_generation_type=True),
    # Some integrations describe Codec 16 with a 2-byte record count; keep this fallback explicit.
    _CodecConfig("codec16", io_id_size=2, io_count_size=2, count_size=2, has_generation_type=True),
)


def crc16_ibm(data: bytes) -> int:
    """Calculate CRC-16/IBM (poly 0xA001, init 0x0000) used by Teltonika AVL packets."""
    crc = 0x0000
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 0x0001:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
            crc &= 0xFFFF
    return crc


class _Reader:
    def __init__(self, data: bytes):
        self.data = data
        self.offset = 0

    def remaining(self) -> int:
        return len(self.data) - self.offset

    def read(self, size: int) -> bytes:
        if size < 0:
            raise TeltonikaProtocolError("Negative field size requested")
        end = self.offset + size
        if end > len(self.data):
            raise TeltonikaProtocolError(
                f"Unexpected end of packet at offset {self.offset}: need {size} bytes"
            )
        value = self.data[self.offset : end]
        self.offset = end
        return value

    def uint(self, size: int) -> int:
        return int.from_bytes(self.read(size), "big", signed=False)

    def int(self, size: int) -> int:
        return int.from_bytes(self.read(size), "big", signed=True)


def parse_packet(packet: bytes) -> TeltonikaPacket:
    """Parse a full Teltonika TCP AVL packet including preamble, length and CRC."""
    if len(packet) < 13:
        raise TeltonikaProtocolError("Packet is too short")

    preamble = packet[:4]
    if preamble != b"\x00\x00\x00\x00":
        raise TeltonikaProtocolError(f"Invalid preamble: {preamble.hex()}")

    data_length = int.from_bytes(packet[4:8], "big")
    expected_total = 8 + data_length + 4
    if len(packet) != expected_total:
        raise TeltonikaProtocolError(
            f"Invalid packet length: declared {data_length} data bytes, got total {len(packet)}"
        )

    data = packet[8 : 8 + data_length]
    transmitted_crc = int.from_bytes(packet[8 + data_length : expected_total], "big") & 0xFFFF
    computed_crc = crc16_ibm(data)
    if transmitted_crc != computed_crc:
        raise TeltonikaProtocolError(
            f"CRC mismatch: transmitted 0x{transmitted_crc:04X}, computed 0x{computed_crc:04X}"
        )

    return parse_data_field(data, transmitted_crc)


def parse_data_field(data: bytes, crc: int | None = None) -> TeltonikaPacket:
    """Parse the Teltonika data field from codec id through second record count."""
    if not data:
        raise TeltonikaProtocolError("Empty Teltonika data field")

    codec_id = data[0]
    if codec_id == CODEC_8:
        return _parse_data_with_config(data, _CODEC_8_CONFIG, crc)
    if codec_id == CODEC_8_EXTENDED:
        return _parse_data_with_config(data, _CODEC_8_EXT_CONFIG, crc)
    if codec_id == CODEC_16:
        errors: list[str] = []
        for config in _CODEC_16_CONFIGS:
            try:
                return _parse_data_with_config(data, config, crc)
            except TeltonikaProtocolError as exc:
                errors.append(str(exc))
        raise TeltonikaProtocolError("Unable to parse Codec 16 packet: " + "; ".join(errors))

    raise TeltonikaProtocolError(f"Unsupported codec id: 0x{codec_id:02X}")


def _parse_data_with_config(
    data: bytes, config: _CodecConfig, crc: int | None = None
) -> TeltonikaPacket:
    reader = _Reader(data)
    codec_id = reader.uint(1)
    record_count = reader.uint(config.count_size)
    records = [_parse_record(reader, config) for _ in range(record_count)]
    repeated_count = reader.uint(config.count_size)

    if repeated_count != record_count:
        raise TeltonikaProtocolError(
            f"Record count mismatch: first {record_count}, second {repeated_count}"
        )
    if reader.remaining() != 0:
        raise TeltonikaProtocolError(f"Unexpected trailing data: {reader.remaining()} bytes")

    return TeltonikaPacket(
        codec_id=codec_id,
        codec_name=config.name,
        records=records,
        declared_record_count=record_count,
        crc=crc if crc is not None else crc16_ibm(data),
        raw_data=data,
    )


def _parse_record(reader: _Reader, config: _CodecConfig) -> AvlRecord:
    timestamp_ms = reader.uint(8)
    priority = reader.uint(1)
    gps = GpsElement(
        longitude=reader.int(4) / 10_000_000,
        latitude=reader.int(4) / 10_000_000,
        altitude=reader.int(2),
        heading=reader.uint(2),
        satellites=reader.uint(1),
        speed=reader.uint(2),
    )

    event_io_id = reader.uint(config.io_id_size)
    generation_type = reader.uint(1) if config.has_generation_type else None
    total_io_count = reader.uint(config.io_count_size)
    io_elements: dict[int, IoElement] = {}

    for value_size in (1, 2, 4, 8):
        group_count = reader.uint(config.io_count_size)
        for _ in range(group_count):
            avl_id = reader.uint(config.io_id_size)
            value = reader.uint(value_size)
            io_elements[avl_id] = IoElement(avl_id=avl_id, value=value, size=value_size)

    if config.has_variable_io:
        variable_count = reader.uint(config.io_count_size)
        for _ in range(variable_count):
            avl_id = reader.uint(config.io_id_size)
            value_length = reader.uint(config.io_count_size)
            value = reader.read(value_length)
            io_elements[avl_id] = IoElement(avl_id=avl_id, value=value, size=value_length)

    if total_io_count != len(io_elements):
        raise TeltonikaProtocolError(
            f"I/O count mismatch: declared {total_io_count}, parsed {len(io_elements)}"
        )

    return AvlRecord(
        timestamp_ms=timestamp_ms,
        priority=priority,
        gps=gps,
        event_io_id=event_io_id,
        total_io_count=total_io_count,
        io_elements=io_elements,
        generation_type=generation_type,
    )


def telemetry_payload(imei: str, packet: TeltonikaPacket) -> list[dict[str, Any]]:
    """Convert parsed AVL records into JSON-friendly telemetry payloads."""
    payloads: list[dict[str, Any]] = []
    for record in packet.records:
        payloads.append(
            {
                "imei": imei,
                "codec": packet.codec_name,
                "timestamp": record.timestamp.isoformat(),
                "timestamp_ms": record.timestamp_ms,
                "priority": record.priority,
                "latitude": record.gps.latitude,
                "longitude": record.gps.longitude,
                "altitude": record.gps.altitude,
                "heading": record.gps.heading,
                "satellites": record.gps.satellites,
                "speed": record.gps.speed,
                "event_io_id": record.event_io_id,
                "generation_type": record.generation_type,
                "io": record.io_by_name(),
                "io_raw": record.io_raw(),
            }
        )
    return payloads
