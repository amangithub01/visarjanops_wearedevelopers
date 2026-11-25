# Implementation plan and milestone record

The supplied brief specified a React + TypeScript PWA and Java 21 / Spring Boot modular monolith backed by PostgreSQL/PostGIS and Redis. Inspection found an empty repository with only Node.js available locally; no Java or Docker command was present. The build therefore establishes a working, no-dependency Node demo while preserving the production architecture in `ARCHITECTURE.md`.

## Completed in this environment

1. **Foundation:** runnable server, persistent demo JSON store, fictional seed sites, setup and licence documentation.
2. **Discovery:** mobile-first home and explore views, filters, details and facility summaries.
3. **Booking:** validated booking request, single-process serialized capacity reservation, random reference and hashed recovery key.
4. **Pass:** booking reference and clearly labeled illustrative visual; real QR and staff scanner are still pending.
5. **Visit status:** simulated SSE endpoint exists, but the page does not yet consume live queue values. No site check-in or visit event management yet.
6. **Assistance and waste:** assistance requests persist with status lookup; waste guidance page is informational and labeled demo where location details would otherwise be implied.
7. **Quality/demo:** mobile responsive styling, explicit demo disclosures, demo reset, API tests and local setup/demo guides.
8. **Apify connector:** protected manual Actor run, server-side token configuration, result-count and per-run cost caps, and staff-only pending-review output. Live use still needs an Apify token, Actor ID and that Actor's input schema.

## Remaining work for the requested definition of done

- Replace static vanilla-JS client with React/TypeScript/Vite and a real installable PWA.
- Implement Java 21 Spring Boot API, validation/security and OpenAPI; PostgreSQL/PostGIS migrations, transactional capacity constraints and Redis only where justified.
- Generate and scan standards-compliant QR using ZXing; authenticate operations staff and validate/revoke/replay-protect passes.
- Add actual visit and check-in workflow, queue event updates consumed by the UI, navigation/maps, cancellation, user-facing secure recovery, facilities/waste APIs, feedback UI and operations dashboard.
- Add contact verification, rate limits, audit retention, multi-process concurrency tests, JUnit/Testcontainers, Playwright and full end-to-end/accessibility testing.
- Add Docker deployment only when Docker is available for validation; verify the selected dependencies and exact licences at implementation time.

No local work files were found to preserve; implementation created the application in the repository root. The user-requested end-to-end public and operations workflow is not complete yet.
