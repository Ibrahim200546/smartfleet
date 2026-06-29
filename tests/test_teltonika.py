from datetime import datetime, timezone

from smartfleet.protocols.teltonika import CODEC_8, crc16_ibm, parse_packet, telemetry_payload

SAMPLE_CODEC8 = bytes.fromhex(
    "0000000000000036"
    "08"
    "01"
    "0000016B40D8EA30"
    "01"
    "00000000"
    "00000000"
    "0000"
    "0000"
    "00"
    "0000"
    "01"
    "05"
    "02"
    "15"
    "03"
    "01"
    "01"
    "01"
    "42"
    "5E0F"
    "01"
    "F1"
    "0000601A"
    "01"
    "4E"
    "0000000000000000"
    "01"
    "0000C7CF"
)


def test_crc16_ibm_matches_teltonika_example() -> None:
    data_length = int.from_bytes(SAMPLE_CODEC8[4:8], "big")
    data = SAMPLE_CODEC8[8 : 8 + data_length]

    assert crc16_ibm(data) == 0xC7CF


def test_parse_codec8_example() -> None:
    packet = parse_packet(SAMPLE_CODEC8)

    assert packet.codec_id == CODEC_8
    assert packet.codec_name == "codec8"
    assert packet.declared_record_count == 1
    assert len(packet.records) == 1
    assert packet.ack == b"\x00\x00\x00\x01"

    record = packet.records[0]
    assert record.timestamp_ms == 1560161086000
    assert record.timestamp == datetime(2019, 6, 10, 10, 4, 46, tzinfo=timezone.utc)
    assert record.priority == 1
    assert record.gps.longitude == 0
    assert record.gps.latitude == 0
    assert record.gps.speed == 0
    assert record.event_io_id == 1
    assert record.total_io_count == 5

    assert record.io_elements[21].value == 3
    assert record.io_elements[1].value == 1
    assert record.io_elements[66].value == 0x5E0F
    assert record.io_elements[241].value == 0x0000601A
    assert record.io_elements[78].value == 0


def test_teltonika_payload_is_json_friendly() -> None:
    packet = parse_packet(SAMPLE_CODEC8)
    payload = telemetry_payload("123456789012345", packet)

    assert payload == [
        {
            "imei": "123456789012345",
            "codec": "codec8",
            "timestamp": "2019-06-10T10:04:46+00:00",
            "timestamp_ms": 1560161086000,
            "priority": 1,
            "latitude": 0.0,
            "longitude": 0.0,
            "altitude": 0,
            "heading": 0,
            "satellites": 0,
            "speed": 0,
            "event_io_id": 1,
            "generation_type": None,
            "io": {
                "gsm_signal": 3,
                "digital_input": 1,
                "external_voltage_mv": 24079,
                "active_gsm_operator": 24602,
                "avl_78": 0,
            },
            "io_raw": {"21": 3, "1": 1, "66": 24079, "241": 24602, "78": 0},
        }
    ]
