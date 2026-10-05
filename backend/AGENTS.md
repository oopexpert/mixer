# AGENTS.md — backend

## Project

Java 21 Maven module (`de.oopexpert.mixer:mixer`). Drink mixing machine controlled via serial COM ports (jSerialComm). Embedded Javalin REST API (port 8080) + state machine + static frontend served from classpath `/static`.

Part of the `mixer` monorepo — see root `AGENTS.md` for build commands and environment setup.

## Packages (`src/main/java`)

- `app` — bootstrap (`MixerApp:main` starts Javalin on `0.0.0.0:8080`, loads `configuration.json` via a lazy supplier so it can be reloaded at runtime).
- `mixer` — state machine (`Mixer`, `MixerState`, `Dispenser`, `*State` classes).
- `mixer.config` — `Configuration` (JSON load/save), `ComPortProviderConfig`.
- `mixer.ingredient` — ingredient types: `Liquid`, `Crystal`, `Viscous`, `Addon`.
- `mixer.port.com` / `mixer.port.dummy` / `mixer.port.provider` — `JSerialCommPort`, `DummySerialPort`, provider + resolver implementations (`Real`, `Dummy`, config-derived, file-based).
- `mixer.recording` — recording sessions for the record-a-recipe flow.
- `recipe` — `Recipe` + typed recipe ingredients with visitor.
- `rest` — `AdminController` (`/admin/*`), `UserController` (`/user/*`).
- `usecase.admin` / `usecase.user` — one use case class per endpoint (e.g. `PrimeUseCase`, `DispenseUseCase`, `PulsePortUseCase`).

## Entrypoints

- `app.MixerApp:main` — starts the server. Must run with CWD = `backend/` (loads `configuration.json` via relative path, writes `mixer.log` to CWD).
- Admin REST: `/admin/*` (all protected by `?adminToken=1234`).
- User REST: `/user/*`.

## State machine

States in `mixer/`: `Initial` → `Startup` → `RequestPrimingContainer` → `PrimingContainerConfirmed` → `Priming` → `MixerDispense` → `MixerDispensing` / `ManualIngredient` → … → `Shutdown`.

`GET /user/status` returns `{ "state": "...", "message": "..." }`.

## Configuration

- `configuration.json` (hand-edited live config). Hot-reloadable via `POST /admin/reload-configuration`, persistable via `POST /admin/save-configuration`.
- `configuration_test.json`, `configuration_wein.json`, `configuration_.json` — alternative config files (not wired into the build; swap manually).
- `ComPortProvider` modes in `comPortProvider.type`:
  - `REAL` — actual hardware (jSerialComm)
  - `CONFIG_DERIVED` — uses configured ports only (for testing with `DummySerialPort`)
  - `FILE` — port names from a separate JSON file

Config sections: `ingredients`, `comIngredients` (port→ingredient mapping + calibration), `recipes`, `requireRecipeToken`.

## Tests

- `mixer.IntegrationTest` — JUnit 5, `@TestInstance(PER_CLASS)` + `@Order`, starts Javalin on a random port, makes real HTTP calls with `HttpClient`.
- Uses an inlined JSON config with the `CONFIG_DERIVED` provider (no hardware needed).
- Run from root: `.\mvnw.cmd test` or `.\mvnw.cmd -pl backend -am test`.

## Maven profiles (`backend/pom.xml`)

- Default build: compiles, copies `../frontend/dist` to `target/classes/static` (`process-resources`), packages the JAR + `target/libs/`.
- `distribution` — Windows `app-image` via `jlink` + `jpackage` (from `${jdk.home}`, defaults to `${java.home}`) → `backend/dist/SmartMixer/`.
- `arm` — `jlink` + `jpackage` inside an `eclipse-temurin:21-jdk` ARM64 Docker container → `backend/dist-arm/SmartMixer/` (runnable on Raspberry Pi).
- The npm frontend build lives in `frontend/pom.xml` (`frontend-maven-plugin`), not in these profiles.

## REST API quirks

- Admin routes use `?adminToken=1234` — hardcoded secret.
- `POST /admin/com-ports/{port}/pulse` must be registered **before** `/admin/com-ports/{port}/{state}` (Javalin route order matters).
- `GET /user/wait-for-idle` polls every 500ms, timeout 30s.
- Manual ingredients (`CRYSTAL`, `VISCOUS`, `ADDON` types) block dispensing until the user confirms via `POST /user/confirm-manual-ingredient/{uuid}`.

## Logging

Log4j2. Config at `src/main/resources/log4j2.xml`. Package-level `DEBUG` for `mixer`, `app`, `recipe`. Rolling file `mixer.log` (in the working directory) + gzipped archives.
