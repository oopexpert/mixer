# AGENTS.md — mixer (monorepo)

## Project

Monorepo for a drink mixing machine (`de.oopexpert.mixer`), controlled via serial COM ports.

- `backend/` — Java 21 Maven module. REST API (Javalin, port 8080) + state machine. Serves the built frontend from classpath `/static`. Details: `backend/AGENTS.md`.
- `frontend/` — Vite + React 19 app (`mixer-frontend`). Dev server proxies `/admin` + `/user` to `http://localhost:8080`. Details: `frontend/AGENTS.md`.

Maven multi-module build: root POM (`mixer-parent`) with modules `frontend` (first) and `backend`. The reactor order matters — the backend copies `../frontend/dist` into `target/classes/static` during `process-resources`.

## Build

All commands run from the **repository root**:

```powershell
.\mvnw.cmd compile               # compiles backend (also builds the frontend via the frontend module)
.\mvnw.cmd test                  # frontend vitest + backend JUnit 5, no hardware required
.\mvnw.cmd package               # frontend build → JAR with UI under classes/static
.\mvnw.cmd install -Pdistribution  # full Windows distribution via jpackage → backend/dist/
.\mvnw.cmd install -Parm           # ARM64 (Raspberry Pi) via Docker → backend/dist-arm/
```

Single modules (from root): `.\mvnw.cmd -pl frontend -am <goal>`, `.\mvnw.cmd -pl backend -am <goal>`. Skip frontend tests with `-DskipTests`.

Frontend wiring:
- `frontend/pom.xml` builds the UI with `frontend-maven-plugin` (downloads its own Node v22 + npm 11 — no globally installed npm needed) in phase `generate-resources`, and runs `vitest run` in phase `test`.
- `backend/pom.xml` copies `../frontend/dist` to `target/classes/static` (`frontend.dir` = `${project.basedir}/../frontend`, relative).
- `jdk.home` defaults to `${java.home}` (the JDK running Maven); override with `-Djdk.home=...` if needed.
- No absolute machine paths in the POMs.

Frontend dev without Maven: `cd frontend && npm run dev` (Vite proxy to the backend on `:8080`).

## Environment (this machine)

Prerequisite: JDK 21 (`JAVA_HOME` set or `java` on `PATH`) — nothing else. Maven comes via the checked-in wrapper (`mvnw` / `mvnw.cmd`, pins Maven 3.9.15, downloads on first run):

```powershell
.\mvnw.cmd test
```

On this machine, neither `java` nor `mvn` is on `PATH`; a JDK 21 lives under `C:\Daten\Programmierung\environments\` (e.g. set `$env:JAVA_HOME` to the `jdk-21.0.5+11` directory there). Example only — do not treat the path as portable.

Node v24 + npm 11 are installed globally (usable for ad-hoc frontend work), but the Maven build pins its own Node v22 via `frontend-maven-plugin`.

## Working directories

- The backend must run with CWD = `backend/`: `MixerApp` loads `configuration.json` via a relative path, and `mixer.log` is written to the working directory.
- `backend/configuration.json` is the live config (hand-edited, hot-reloadable via `POST /admin/reload-configuration`).

## Tests

- `.\mvnw.cmd test` (root) runs everything: frontend `*.test.jsx` via vitest, backend `mixer.IntegrationTest` (JUnit 5, ordered, real HTTP calls against Javalin on a random port, inlined `CONFIG_DERIVED` test config — no hardware needed).
