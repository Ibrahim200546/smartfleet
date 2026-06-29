# SmartFleet architecture

## Runtime components

```mermaid
flowchart TD
    Tracker[GPS tracker] -->|TCP IMEI + AVL packets| TcpServer[TCP ingestion server]
    TcpServer --> Auth[IMEI auth service]
    Auth --> DB[(Relational DB)]
    TcpServer --> Decoder[Protocol decoder]
    Decoder --> Teltonika[Teltonika Codec 8/8E/16]
    Decoder --> Quicklink[Quicklink vendor decoder]
    Teltonika --> Persistence[Telemetry persistence service]
    Quicklink --> Persistence
    Persistence --> DB
    API[REST API] --> DB
    Web[Web or mobile UI] --> API
    Reports[Reports and analytics] --> DB
```

Responsibilities:

- **TCP ingestion server**: accepts many socket connections asynchronously, logs lifecycle/errors, performs Teltonika IMEI handshake and sends AVL acknowledgements.
- **Authentication service**: checks `trackers.imei`, optionally auto-registers new devices, rejects disabled trackers.
- **Protocol decoders**: validate packet integrity and normalize telemetry objects. Teltonika CRC-16/IBM is implemented; Quicklink requires vendor documentation.
- **Persistence service**: stores coordinates, timestamps, speed, GPS quality and all raw/named I/O parameters.
- **API**: exposes CRUD/query endpoints for frontend, mobile apps and integrations.

## ER diagram

```mermaid
erDiagram
    roles ||--o{ users : has
    vehicles ||--o{ trackers : uses
    vehicles ||--o{ telemetry : receives
    trackers ||--o{ telemetry : sends
    drivers ||--o{ driver_assignments : assigned
    vehicles ||--o{ driver_assignments : has
    vehicles ||--o{ routes : has
    vehicles ||--o{ events : has
    drivers ||--o{ events : related
    telemetry ||--o{ events : triggers
    vehicles ||--o{ fuel_sensors : has
    vehicles ||--o{ fuel_refills : has
    vehicles ||--o{ fuel_drains : has
    users ||--o{ login_audit : logs
    users ||--o{ data_change_audit : changes
    users ||--o{ user_action_audit : actions

    roles {
        int id PK
        string name UK
        json permissions
    }

    users {
        int id PK
        string email UK
        string password_hash
        int role_id FK
        bool is_active
    }

    vehicles {
        int id PK
        string registration_number UK
        string make
        string model
        string vin UK
        string status
        json attributes
    }

    trackers {
        int id PK
        string imei UK
        string device_type
        string protocol
        int vehicle_id FK
        bool is_allowed
        bool is_online
        datetime last_seen_at
        json settings
    }

    drivers {
        int id PK
        string full_name
        string phone
        string license_number UK
        json attributes
    }

    driver_assignments {
        int id PK
        int driver_id FK
        int vehicle_id FK
        datetime starts_at
        datetime ends_at
    }

    telemetry {
        bigint id PK
        int tracker_id FK
        int vehicle_id FK
        datetime timestamp
        datetime received_at
        float latitude
        float longitude
        float speed
        float heading
        float altitude
        int satellites
        string codec
        json sensors
        json raw_io
    }

    routes {
        int id PK
        int vehicle_id FK
        datetime start_time
        datetime end_time
        float distance_km
        json path_geojson
        json summary
    }

    events {
        int id PK
        int vehicle_id FK
        int driver_id FK
        int telemetry_id FK
        datetime timestamp
        string type
        float latitude
        float longitude
        string description
        json payload
    }

    fuel_sensors {
        int id PK
        int vehicle_id FK
        string name
        string sensor_type
        int avl_id
        json calibration_table
    }

    fuel_refills {
        int id PK
        int vehicle_id FK
        datetime timestamp
        float volume_liters
        float latitude
        float longitude
    }

    fuel_drains {
        int id PK
        int vehicle_id FK
        datetime timestamp
        float volume_liters
        float latitude
        float longitude
    }
```

## Important indexes

- `trackers.imei` — IMEI lookup during TCP handshake.
- `vehicles.registration_number` — fleet search by vehicle number.
- `telemetry(vehicle_id, timestamp)` — tracks and reports by vehicle and period.
- `telemetry(tracker_id, timestamp)` — latest packet and tracker-level diagnostics.
- `routes(vehicle_id, start_time, end_time)` — generated trip reports.
- `events(vehicle_id, timestamp)` — event timeline and reports.
- `fuel_refills(vehicle_id, timestamp)` and `fuel_drains(vehicle_id, timestamp)` — fuel analytics by period.

## Next implementation milestones

1. Add migrations with Alembic before production use.
2. Implement role-based access checks and JWT/session authentication in the API.
3. Add route, stop, fuel refill/drain and report generation services.
4. Add a frontend map using Leaflet/OpenLayers and OSM tiles.
5. Add a concrete Quicklink decoder after receiving the vendor protocol document.
6. Move high-load ingestion to PostgreSQL + queue workers when the tracker count grows.
