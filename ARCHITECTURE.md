# Architecture

## Implemented local demo

```text
Browser (HTML/CSS/vanilla JavaScript)
   ├── GET /api/v1/public/sites
   ├── POST /api/v1/public/bookings  ── serialized capacity check
   ├── GET /api/v1/public/bookings/{ref}?key=…
   ├── POST /api/v1/public/assistance-requests
   └── GET /api/v1/public/live       ── simulated SSE snapshot
                       │
              Node.js HTTP API
                 ├── data/demo.json
                 └── Apify API (optional; staff-triggered)
```

The storage layer is intentionally small for zero-setup demos. A process-local reservation queue prevents overlapping booking requests in a single server process. It does not provide multi-process locking or database transactions. Booking references are random; a separate random recovery key is returned once and only its SHA-256 hash is saved. Public retrieval requires the reference and key.

Operations access is separated from public site discovery. Configure `OPS_USERNAME` and a unique `OPS_PASSWORD` (minimum 12 characters) before server startup. Login sets a random HttpOnly, SameSite=Strict cookie; the server stores only its SHA-256 digest with an eight-hour expiry. The `/api/v1/operations/sites` data route checks the active session. Failed login attempts are rate-limited per local connection address. Sessions are process-memory only and disappear when the server restarts. Use an established identity provider and durable session/security controls before real deployment.

Apify is an optional server-side connector configured with `APIFY_API_TOKEN`, `APIFY_ACTOR_ID`, and `APIFY_ACTOR_INPUT_JSON`. Staff can explicitly start the configured Actor from Operations. The connector caps output at 1–100 items (25 by default), sets a $1 maximum charge per run by default (configurable), keeps the API token server-side, and stages the latest three results in `data/demo.json` with `pending-review` status. Staged output is not published to site listings or used by booking logic.

## Production target

Keep a modular monolith. Package domains for sites, discovery, availability, bookings, passes/check-in, queue/visits, assistance, facilities/waste, feedback, notifications and audit. Controllers validate/map DTOs; services hold business rules; repositories persist entities. Use a PostgreSQL transaction and a slot-row lock/atomic conditional update for competing reservations. Persist hashed recovery credentials, expiring/revocable signed pass payloads, unique idempotency keys, and append-only check-in/audit events. Authenticate staff roles and expose operations endpoints separately from the public API. Add rate limiting and contact verification for recovery.

PostGIS supports nearby-site discovery and spatial indexes. Redis should be added only for a defined cache or ephemeral workload. SSE can publish queue snapshots with timestamp, source and clear stale-data state. Keep map/routing integrations behind configuration and interfaces. Treat any simulated queue or facility detail as demo data until integrated with an authorised source.

## API in the demo

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/public/sites` | Fictional demo site list; optional `q` search |
| GET | `/api/v1/public/sites/{siteId}` | One demo site |
| POST | `/api/v1/public/bookings` | Validated capacity reservation |
| GET | `/api/v1/public/bookings/{reference}?key=…` | Recover a booking with its secret key |
| GET | `/api/v1/public/bookings/{reference}/pass?key=…` | Pass metadata with the booking recovery key (demo payload only) |
| POST | `/api/v1/public/assistance-requests` | Save a request against a booking reference |
| GET | `/api/v1/public/assistance-requests/{reference}` | Request status |
| POST | `/api/v1/public/feedback` | Persist feedback payload |
| GET | `/api/v1/public/live` | Simulated event stream snapshots |
| POST | `/api/v1/public/demo/reset` | Reset local data in demo mode |
| GET | `/api/v1/operations/auth/session` | Report whether the current browser has an operations session |
| POST | `/api/v1/operations/auth/login` | Sign into operations with configured server credentials |
| POST | `/api/v1/operations/auth/logout` | End the current operations session |
| GET | `/api/v1/operations/sites` | Session-protected operations site overview |
| GET | `/api/v1/operations/apify/status` | Session-protected Apify configuration and latest staged import |
| POST | `/api/v1/operations/apify/run` | Session-protected manual Actor run; stage capped results for review |

This API is a development/demo surface. It does not implement staff authentication or production-ready abuse controls.
