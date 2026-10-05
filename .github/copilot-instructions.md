# mixer — Agent Instructions

## Build & Test

```powershell
$env:JAVA_HOME = "C:\Daten\Programmierung\environments\jdk-21.0.5+11"
.\mvnw.cmd test
```

Maven comes via the wrapper (`mvnw` / `mvnw.cmd`, pins Maven 3.9.15). The frontend module downloads its own Node via `frontend-maven-plugin` — no global npm needed. On this machine neither `java` nor `mvn` is on `PATH`; set `JAVA_HOME` as above (example path, not portable).

## Module docs

- `AGENTS.md` (root) — monorepo overview, commands, environment
- `backend/AGENTS.md` — Java backend: packages, state machine, REST quirks, profiles
- `frontend/AGENTS.md` — Vite React app: scripts, components, tests, lint

## Release Process

Releases are versioned via Conventional Commits (`fix:` = patch, `feat:` = minor, `!:` / `BREAKING CHANGE:` footer = major, `chore:` / `docs:` / `test:` / `ci:` / `refactor:` = no release), with no pull request involved:

A single workflow, `.github/workflows/release-version.yml` (`workflow_dispatch`), does everything in one run: scans commits since the last `vX.Y.Z` tag, computes the next version, bumps the root `pom.xml` (modules inherit the version) and root `CHANGELOG.md`, commits + tags directly on `main` (no-op if no `fix:` / `feat:` / breaking commit found), builds the Windows (`-Pdistribution`) and ARM (`-Parm`, Docker) distributions with the Maven wrapper, and creates the GitHub Release with both zips attached. A plain CI workflow (`.github/workflows/build.yml`) runs `./mvnw -B test` on every push/PR to `main`.
