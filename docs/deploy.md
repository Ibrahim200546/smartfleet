# Deploy SmartFleet

## Frontend on Vercel

1. Push the repository to `https://github.com/Ibrahim200546/smartfleet`.
2. In Vercel, import the `smartfleet` repository.
3. Vercel settings are already defined in `vercel.json`:
   - framework: Next.js;
   - install command: `pnpm install --frozen-lockfile`;
   - build command: `pnpm build`;
   - output directory: `.next`.
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-backend-api.example.com`.
5. Deploy.

If `NEXT_PUBLIC_API_URL` is not configured or the API is unavailable, the frontend falls back to demo telemetry.

## Backend hosting

Vercel is not suitable for the Teltonika TCP ingestion server because it requires long-lived raw TCP sockets.

Deploy these backend processes separately:

- `smartfleet-api` — REST API for frontend;
- `smartfleet-tcp` — Teltonika TCP server on port `5027` or another open TCP port.

Recommended targets: VPS, Fly.io, Render, Railway or any container/VM host with TCP port support.

Set backend CORS for the Vercel domain:

```bash
SMARTFLEET_CORS_ORIGINS=https://your-project.vercel.app
```

## Local release checks

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm build
python -m pytest
```
