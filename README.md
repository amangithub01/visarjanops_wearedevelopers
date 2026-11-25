# VisarjanOps

**Your visarjan, thoughtfully organised.** A mobile-first civic-tech demo that connects immersion-site discovery, slot booking, a booking pass and assistance requests. The interface uses a warm ivory and saffron Ganeshotsav theme with subtle rangoli-inspired artwork and responsive layouts.

> **Demo boundary:** the four Pune site names, locations, operating information, availability, queues and facilities are fictional. They are not municipal sites or live operational information. The current local demo does not connect to municipal systems, GPS, map tiles, email, SMS, QR scanners or staff identity services. Apify is an optional, manually started import for staging public-source results; it does not update site listings.

## Run locally

Requirements: Node.js 20 or later. The local demo starts without a database or external account; Apify is optional and requires an Apify account.

```powershell
$env:OPS_USERNAME = 'site-ops'
$env:OPS_PASSWORD = 'choose-a-unique-password-at-least-12-characters'
npm run dev
```

Open [http://localhost:4173](http://localhost:4173). The API creates `data/demo.json` at first startup. Set `PORT` to change the port. Set `DEMO_MODE=false` to disable the public demo-reset endpoint.

The **Staff sign in** link opens the operations login. Use the username/password set in the server environment above. Passwords are not stored in the repository or demo database. If either variable is missing (or the password is shorter than 12 characters), operations sign-in stays disabled. Sessions use an HttpOnly, SameSite=Strict cookie, expire after eight hours and are kept in memory until expiry or sign-out; restarting the server clears them. The demo server listens on `127.0.0.1`. Configure a real identity provider, HTTPS and persistent session controls before any shared deployment.

## Optional Apify connection

Apify runs only after an operations user clicks **Run configured Actor**. To configure it, set these variables in the same PowerShell window before `npm run dev`:

```powershell
$env:APIFY_API_TOKEN = 'your Apify API token'
$env:APIFY_ACTOR_ID = 'your-account~your-actor'
$env:APIFY_ACTOR_INPUT_JSON = '{"startUrls":[{"url":"https://example.org"}]}'
$env:APIFY_MAX_ITEMS = '25'
$env:APIFY_MAX_TOTAL_CHARGE_USD = '1'
npm run dev
```

Use the input fields required by your chosen Actor; the `startUrls` example is only illustrative. The API token stays on the server and is never sent to the browser. Each run has a $1 maximum charge by default; change `APIFY_MAX_TOTAL_CHARGE_USD` deliberately if your Actor needs a higher cap. Results are limited to 1–100 items (25 by default), saved as pending review in the local demo store, and shown only in Operations. They do not change public site records or bookings. The three most recent runs are retained in `data/demo.json`. `.env.example` lists the names, but this zero-dependency demo does not automatically load `.env` files.

To reset demonstration reservations, use **Reset demo data** on the booking page. It clears local bookings and restores the fictional site's initial slot counts. The reset is available only in demo mode.

## Demo walkthrough

1. Open Explore and compare the four explicitly fictional sites.
2. Open Lakeview Artificial Pond and choose an arrival window.
3. Enter a name, email and group size. The API validates and reserves capacity before confirming.
4. View the booking page and reference.
5. Select a help category. The assistance request is saved and receives a reference.
6. Use the waste guidance page to review basic sorting guidance.
7. Reset the demo before the next walkthrough.

The pass currently displays a demo visual derived from the reference. It is **not a standards-compliant, scanner-valid QR code** and must not be used for entry. The demo has no staff scanner/check-in workflow. These are known gaps, not live features.

## Current repository and architecture

The working application uses a dependency-free Node.js HTTP server plus a static HTML/CSS/JavaScript client, with JSON-file persistence in `data/demo.json`. The server implements public site discovery, booking creation with serialized slot-capacity reservation, secured booking lookup by a random recovery key (stored as a hash), pass metadata, assistance request create/status, feedback persistence, simulated SSE, demo reset, and an optional protected Apify Actor run that stages a capped dataset for staff review. The interface is responsive and uses fictional demo data.

This is a runnable foundation, not the complete Node.js/PostgreSQL platform planned for production. The application does not yet provide React/TypeScript, PostgreSQL/PostGIS, Redis, production database migrations, a production identity provider, real QR generation/scanning, cancellation, facilities API, live queue processing, navigation, or complete visit/feedback UI. Do not represent these features as implemented.

### Intended production architecture

- React + TypeScript + Vite PWA for the public client; React Router, TanStack Query, React Hook Form/Zod, i18next, Workbox, MapLibre and ZXing where appropriate.
- Node.js modular monolith for the API and business logic, evolving the existing server; add request validation, OpenAPI documentation, and production-grade staff authentication. Do not introduce a Java/Spring Boot service.
- PostgreSQL + PostGIS for persistent and spatial data, with Node.js-compatible migrations and database access; Redis only for a defined ephemeral workload; SSE for live queue updates.
- Docker Compose for local infrastructure. Configurable map tiles and optional OSRM; never rely on public OSM tiles for unlimited production traffic.
- Role-based, authenticated staff operations; privacy-preserving public booking recovery; audit events, cancellation, check-in replay protection and idempotency.

The demo storage file is for local demonstration only: simultaneous processes, durable transactional guarantees, authentication and data retention are not supported. Use an actual transactional database and threat-model review before deployment.

## Verification

With the demo server running in one terminal, run `npm test` in another terminal for the local API smoke test (including concurrent capacity reservation). Run `npm run check` for Node source syntax validation. This is not a complete backend, authorization, QR-scan or browser end-to-end suite; accessibility review and broader tests are needed before production readiness.

## Licensing and attribution

This repository has no runtime npm dependencies. The application code is offered under MIT; see `LICENSE`. The UI uses Google Fonts via the fonts.googleapis.com service when online (Poppins, Inter and Noto Sans Devanagari, SIL Open Font License 1.1); system sans-serif fallbacks work without a network connection. Source listings and full license text are in `THIRD_PARTY_NOTICES.md`. No map tiles or map data are currently loaded.

The Operations route requires configured staff credentials and shows fictional site data alongside the optional manual Apify import control. It does not provide site editing or approve imported data into public listings. The header uses the Ganesh logo supplied by the user, cropped to fit the brand mark.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DEMO_GUIDE.md](DEMO_GUIDE.md) and [DEPENDENCY_AUDIT.md](DEPENDENCY_AUDIT.md).
