# Dependency audit

Audit scope: dependencies declared by this repository as created on 2026-11-25.

| Component | Version | Licence | Findings |
|---|---:|---|---|
| Node.js runtime | Host-provided, Node >=20 | MIT for Node.js project; bundled components retain their own notices | No runtime package dependency. Runtime is not redistributed. |
| Google Fonts Poppins / Inter / Noto Sans Devanagari | Remote hosted fonts, no pinned version | SIL OFL 1.1 | Optional network request; system sans-serif fallbacks are provided. Consider self-hosting exact font files and notices in production. |

No package lock is needed because no packages are declared. No transitive application dependencies are installed. No known CVE scan was run; this report is an inventory and licence check, not a security certification. Production dependency selection should pin versions, retain lockfiles and repeat licence and vulnerability review.
