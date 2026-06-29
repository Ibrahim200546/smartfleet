# SmartFleet

SmartFleet is a fleet monitoring platform that combines:

- **Next.js frontend** ready for Vercel deployment;
- **FastAPI REST API** for vehicles, trackers and telemetry;
- **asyncio TCP ingestion server** for Teltonika devices;
- **Teltonika Codec 8 / 8 Extended / 16 parser** with CRC-16/IBM validation;
- **SQLAlchemy relational schema** for users, roles, vehicles, trackers, drivers, telemetry, routes, events, fuel and audit logs;
- **Quicklink decoder extension point** for a vendor-provided packet specification.

The frontend was merged into this main repository so GitHub `Ibrahim200546/smartfleet` can be imported directly in Vercel.

## Frontend features

Routes included in the release MVP:

- `/` — fleet dashboard and release readiness summary;
- `/monitoring` — live map with Leaflet/OpenStreetMap, vehicle list and telemetry card;
- `/vehicles` — vehicle registry;
- `/trackers` — tracker/IMEI registry and connectivity status;
- `/drivers` — drivers and assignments;
- `/events` — event feed;
- `/history` — route history and playback entry points;
- `/routes` — route planning UI;
- `/fuel` — fuel sensors, refills/drains and calibration UI;
- `/reports` — report templates for mileage/routes/stops/fuel;
- `/settings` — API, CORS, roles, map and Vercel settings.

The frontend reads `NEXT_PUBLIC_API_URL/fleet/snapshot` when configured. If the backend is not configured or unavailable, it stays usable in demo mode with simulated telemetry.

## Install frontend

```bash
corepack pnpm install --frozen-lockfile
```

Run locally:

```bash
corepack pnpm dev
```

Build locally:

```bash
corepack pnpm typecheck
corepack pnpm build
```

## Install backend

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -e .[dev]
```

On Linux/macOS use `. .venv/bin/activate` instead.

Run tests:

```bash
pytest
```

## Run API

```bash
smartfleet-api --host 0.0.0.0 --port 8000
```

OpenAPI documentation: `http://localhost:8000/docs`.

Useful endpoints:

- `GET /health`
- `GET /fleet/snapshot` — frontend-ready fleet snapshot;
- `POST /vehicles`
- `GET /vehicles`
- `POST /trackers`
- `GET /trackers`
- `GET /vehicles/{vehicle_id}/telemetry/latest`
- `GET /vehicles/{vehicle_id}/telemetry?start=...&end=...`
- `GET /trackers/{imei}/telemetry/latest`

## Run Teltonika TCP ingestion

```bash
smartfleet-tcp --host 0.0.0.0 --port 5027
```

Teltonika flow:

1. Tracker sends `2 bytes IMEI length + ASCII IMEI`.
2. Server checks/creates `trackers` row and replies `0x01` or `0x00`.
3. Tracker sends AVL packets.
4. Server validates preamble, length and CRC-16/IBM.
5. Server saves telemetry and replies with the accepted record count as a 4-byte big-endian integer.

> Vercel cannot host long-lived raw TCP servers. Deploy the TCP ingestion/API service on a VPS, Fly.io, Render, Railway or another host with open TCP ports, then point Vercel frontend to that API via `NEXT_PUBLIC_API_URL`.

## Environment variables

Copy `.env.example` to `.env.local` for local frontend work and/or configure variables in Vercel.

Frontend:

- `NEXT_PUBLIC_API_URL` — external REST API URL, for example `https://api.example.com`.

Backend:

- `SMARTFLEET_DATABASE_URL` — SQLAlchemy async URL, defaults to `sqlite+aiosqlite:///./smartfleet.db`;
- `SMARTFLEET_API_HOST` / `SMARTFLEET_API_PORT` — REST API bind;
- `SMARTFLEET_CORS_ORIGINS` — comma-separated allowed frontend origins;
- `SMARTFLEET_TCP_HOST` / `SMARTFLEET_TCP_PORT` — Teltonika TCP bind;
- `SMARTFLEET_AUTO_REGISTER_TRACKERS` — `true` to auto-create unknown IMEI records;
- `SMARTFLEET_TCP_READ_TIMEOUT_SECONDS` — connection read timeout.

## Deploy frontend to Vercel

1. Push this repository to `https://github.com/Ibrahim200546/smartfleet`.
2. In Vercel: **Add New → Project → Import Git Repository → smartfleet**.
3. Framework preset: **Next.js**.
4. Build settings are already in `vercel.json`:
   - Install command: `pnpm install --frozen-lockfile`
   - Build command: `pnpm build`
   - Output directory: `.next`
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-backend-api.example.com`
6. Add the Vercel domain to backend CORS:
   - `SMARTFLEET_CORS_ORIGINS=https://your-project.vercel.app`

## Quicklink

Quicklink packet syntax is vendor-specific and is intentionally not guessed. Implement `QuicklinkDecoder` in `src/smartfleet/protocols/quicklink.py` once the manufacturer provides:

- session identification/IMEI format;
- frame boundaries and field separators;
- coordinate, speed, sensor and timestamp encoding;
- checksum/CRC/LRC algorithm.

## Project layout

```text
app/                    Next.js routes
components/             Frontend UI and monitoring widgets
hooks/                  Frontend state hooks
lib/                    Frontend types, mock data and API client
src/smartfleet/api/     FastAPI app
src/smartfleet/db/      SQLAlchemy schema and session helpers
src/smartfleet/protocols/ Teltonika parser and Quicklink extension point
src/smartfleet/services/ Authentication and telemetry persistence services
src/smartfleet/tcp/     asyncio TCP ingestion server
tests/                  Parser and persistence tests
```

See `docs/architecture.md` for the ER diagram and module responsibilities.
