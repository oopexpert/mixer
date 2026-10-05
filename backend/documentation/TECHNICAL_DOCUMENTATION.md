# SmartMixer – Technische Dokumentation

## Inhaltsverzeichnis

1. [Einleitung & Zielsetzung](#1-einleitung--zielsetzung)
2. [Systemübersicht](#2-systemübersicht)
3. [Build – Windows-Distribution](#3-build--windows-distribution)
4. [Build – ARM-Distribution (Raspberry Pi)](#4-build--arm-distribution-raspberry-pi)
5. [Konfiguration (`configuration.json`)](#5-konfiguration-configurationjson)
   - [5.1 JSON-Schema](#51-json-schema)
   - [5.2 Elemente im Detail](#52-elemente-im-detail)
6. [Betrieb als systemd-Service auf dem Raspberry Pi](#6-betrieb-als-systemd-service-auf-dem-raspberry-pi)
7. [Nützliche Befehle](#7-nützliche-befehle)
8. [Aufzeichnungsmodus (Recording Mode)](#8-aufzeichnungsmodus-recording-mode)
   - [8.1 Überblick](#81-überblick)
   - [8.2 State-Machine-Erweiterung](#82-state-machine-erweiterung)
   - [8.3 API-Endpunkte](#83-api-endpunkte)
   - [8.4 Zeitberechnung](#84-zeitberechnung)
   - [8.5 Neue Klassen & Pakete](#85-neue-klassen--pakete)

---

## 1. Einleitung & Zielsetzung

**SmartMixer** ist eine selbst entwickelte Software zur Steuerung eines automatisierten Cocktail-Dispensers. Die Anwendung betreibt eine REST-API (auf Port `8080`), über die sowohl Benutzer (Rezept auswählen & Getränk abfüllen) als auch Administratoren (Pumpen konfigurieren, kalibrieren, primen, Tokens verwalten) mit dem System interagieren.

Das Ziel des Projekts ist es, handelsübliche peristaltische Pumpen, die über serielle COM-Schnittstellen (USB-to-Serial) angesteuert werden, zu einem vollwertigen, über ein Web-Frontend bedienbaren Getränkedispenser zu kombinieren. Das System läuft sowohl auf Windows (Entwicklung & Test) als auch auf einem Raspberry Pi (Produktionseinsatz) und bringt dank `jlink`/`jpackage` seine eigene minimale Java-Laufzeitumgebung mit – eine JRE-Installation auf dem Zielsystem ist nicht erforderlich.

---

## 2. Systemübersicht

| Komponente        | Technologie / Detail                                      |
|-------------------|-----------------------------------------------------------|
| Backend           | Java 21, Javalin 7.1 (Embedded Jetty), REST-API          |
| Frontend          | Vite/npm, wird als statische Ressource aus dem Classpath  |
| Serialkommunikation | jSerialComm 2.10.2 (Pumpenansteuerung via COM-Port)    |
| Konfiguration     | `configuration.json` im Arbeitsverzeichnis der App        |
| Build             | Apache Maven 3.9+                                         |
| Zielplattform     | Windows (x64) und Linux ARM64 (Raspberry Pi 4/5)         |
| Port              | `8080` (alle Interfaces, `0.0.0.0`)                       |

Die Anwendung startet direkt aus dem Arbeitsverzeichnis und erwartet dort eine `configuration.json`. Logs werden über Log4j2 ausgegeben (Konfiguration in `log4j2.xml`).

---

## 3. Build – Windows-Distribution

### Voraussetzungen

- JDK 21 (`JAVA_HOME` gesetzt oder `java` im `PATH`)
- Maven über den Wrapper (`mvnw` / `mvnw.cmd` im Repo-Root, keine Installation nötig)
- Node.js / npm nur für `npm run dev` nötig (der Maven-Build nutzt sein eigenes Node via `frontend-maven-plugin`)

### Build-Befehl (ab Repo-Root)

```powershell
.\mvnw.cmd clean install -P distribution
```

Der Maven-Lifecycle durchläuft dabei folgende Schritte:

| Phase               | Aktion                                                                  |
|---------------------|-------------------------------------------------------------------------|
| `generate-resources` | Frontend-Modul baut die UI (`frontend-maven-plugin`: `npm install` + `npm run build`) |
| `process-resources`  | Frontend-Build (`frontend/dist/`) wird nach `backend/target/classes/static/` kopiert |
| `package`            | JAR wird gebaut; alle Abhängigkeiten nach `backend/target/staging/` kopiert   |
| `install`            | `jlink` erzeugt minimale JRE in `backend/target/mixer-runtime/`               |
| `install`            | `jpackage` erzeugt `backend/dist/SmartMixer/` (selbstenthaltendes App-Image)  |

### Ergebnis

```
backend/dist/
└── SmartMixer/
    ├── SmartMixer.exe      ← Startprogramm (Windows-Konsolenanwendung)
    ├── app/
    │   └── SmartMixer.cfg
    └── runtime/            ← Minimale JRE (kein systemweites Java nötig)
```

Zum Starten reicht ein Doppelklick auf `SmartMixer.exe` oder der Aufruf aus einem Terminal. Die `configuration.json` muss sich dabei im **Arbeitsverzeichnis** der Anwendung befinden (standardmäßig im Verzeichnis von `SmartMixer.exe`).

---

## 4. Build – ARM-Distribution (Raspberry Pi)

### Voraussetzungen

- Docker Desktop (aktiv, mit aktiviertem QEMU/BuildKit für `linux/arm64`)
- Das Docker-Image `eclipse-temurin:21-jdk` muss vorhanden oder herunterladbar sein
- Maven über den Wrapper wie beim Windows-Build (kein globales npm nötig)

> **Wichtig:** `jlink` und `jpackage` werden bei der ARM-Distribution **innerhalb** eines ARM64-Docker-Containers ausgeführt, da die erzeugten Binaries zur Zielarchitektur passen müssen. Der Build selbst läuft auf dem Windows-Entwicklungsrechner.

### Build-Befehl (ab Repo-Root)

```powershell
.\mvnw.cmd clean install -P arm
```

| Phase               | Aktion                                                                              |
|---------------------|-------------------------------------------------------------------------------------|
| `generate-resources` | Frontend-Modul baut die UI (`frontend-maven-plugin`: `npm install` + `npm run build`) |
| `process-resources`  | Frontend-Build nach `backend/target/classes/static/` kopiert                              |
| `package`            | JAR gebaut; Abhängigkeiten nach `backend/target/staging/` kopiert                         |
| `install`            | Docker-Container (`linux/arm64`) führt `jlink` + `jpackage` aus                   |
| `install`            | Ergebnis landet in `backend/dist-arm/SmartMixer/` auf dem Host                            |

### Ergebnis

```
backend/dist-arm/
└── SmartMixer/
    ├── bin/
    │   └── SmartMixer      ← Linux ARM64-Executable (kein systemweites Java nötig)
    └── lib/
        ├── app/
        │   └── SmartMixer.cfg
        └── runtime/        ← Minimale JRE für ARM64
```

### Deployment auf den Raspberry Pi

```bash
# Verzeichnis auf den Pi kopieren (via scp oder rsync)
scp -r backend/dist-arm/SmartMixer pi@<raspberry-ip>:/home/pi/SmartMixer

# Startskript ausführbar machen
ssh pi@<raspberry-ip> chmod +x /home/pi/SmartMixer/bin/SmartMixer

# configuration.json ins Arbeitsverzeichnis kopieren
scp configuration.json pi@<raspberry-ip>:/home/pi/SmartMixer/
```

### Ermittlung benötigter Java-Module (Hilfsbefehle für Modulanpassungen)

Falls die Liste der `--add-modules` in `pom.xml` nach Hinzufügen neuer Abhängigkeiten angepasst werden muss, können die tatsächlich benötigten Module im ARM64-Container ermittelt werden:

```powershell
# Run from the repository root
docker run --rm --platform linux/arm64 `
  -v ${PWD}\backend\target\staging:/staging `
  eclipse-temurin:21-jdk `
  bash -c "jdeps --multi-release 21 --ignore-missing-deps --print-module-deps /staging/*.jar 2>/dev/null"
```

## 5. Konfiguration (`configuration.json`)

Die Anwendung liest die Datei `configuration.json` aus ihrem Arbeitsverzeichnis. Sie kann zur Laufzeit über den Admin-Endpunkt `POST /admin/reload-configuration` neu geladen werden, ohne die Anwendung neu zu starten.

### 5.1 JSON-Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SmartMixer Configuration",
  "type": "object",
  "required": ["comPortProvider", "ingredients", "comIngredients", "recipes"],
  "properties": {
    "comPortProvider": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["REAL", "CONFIG_DERIVED", "FILE"],
          "description": "Strategie zur Ermittlung verfügbarer COM-Ports"
        },
        "file": {
          "type": ["string", "null"],
          "description": "Pfad zur JSON-Datei mit Port-Namen; nur bei type=FILE relevant"
        }
      }
    },
    "requireRecipeToken": {
      "type": "boolean",
      "default": true,
      "description": "Ob Benutzer einen vom Admin erzeugten Token benötigen, um ein Rezept abzufüllen"
    },
    "ingredients": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "name", "uuid"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["LIQUID", "VISCOUS", "CRYSTAL", "ADDON"]
          },
          "name": { "type": "string" },
          "uuid": { "type": "string", "format": "uuid" }
        }
      }
    },
    "comIngredients": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["uuid", "com", "ingredient", "calibration"],
        "properties": {
          "uuid":        { "type": "string", "format": "uuid" },
          "com":         { "type": "string", "description": "COM-Port-Name, z.B. COM4 oder /dev/ttyUSB0" },
          "ingredient":  { "type": "string", "format": "uuid", "description": "UUID des zugeordneten Ingredients" },
          "calibration": { "type": "integer", "description": "Kalibrierungswert in Millisekunden (ms pro ml)" }
        }
      }
    },
    "recipes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "uuid", "recipeIngredients"],
        "properties": {
          "name": { "type": "string" },
          "uuid": { "type": "string", "format": "uuid" },
          "recipeIngredients": {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "description": "Flüssige Zutat (Pumpe via COM-Port)",
                  "type": "object",
                  "required": ["type", "ingredientUUID", "durationMilliseconds"],
                  "properties": {
                    "type":                 { "const": "LIQUID" },
                    "ingredientUUID":       { "type": "string", "format": "uuid" },
                    "durationMilliseconds": { "type": "integer", "minimum": 0 }
                  }
                },
                {
                  "description": "Viskose Zutat (Sirup; manuell oder via Pumpe)",
                  "type": "object",
                  "required": ["type", "ingredientUUID"],
                  "properties": {
                    "type":           { "const": "VISCOUS" },
                    "ingredientUUID": { "type": "string", "format": "uuid" }
                  }
                },
                {
                  "description": "Kristalline Zutat (z.B. Zucker; via Drehgeber/Schrittmotor)",
                  "type": "object",
                  "required": ["type", "ingredientUUID", "rotations"],
                  "properties": {
                    "type":           { "const": "CRYSTAL" },
                    "ingredientUUID": { "type": "string", "format": "uuid" },
                    "rotations":      { "type": "integer", "minimum": 0 }
                  }
                },
                {
                  "description": "Garnitur / Addon (immer manuell)",
                  "type": "object",
                  "required": ["type", "ingredientUUID"],
                  "properties": {
                    "type":           { "const": "ADDON" },
                    "ingredientUUID": { "type": "string", "format": "uuid" }
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

---

### 5.2 Elemente im Detail

#### `comPortProvider`

Steuert, wie die Anwendung die vorhandenen COM-Ports zur Laufzeit ermittelt.

| Feld   | Typ            | Beschreibung |
|--------|----------------|--------------|
| `type` | `string` (Enum) | Strategie der Port-Erkennung (siehe Tabelle unten) |
| `file` | `string\|null` | Dateipfad; nur relevant bei `type = FILE` |

**Strategie-Typen:**

| Wert             | Verhalten |
|------------------|-----------|
| `REAL`           | Die Anwendung fragt das Betriebssystem nach tatsächlich vorhandenen seriellen Ports (echte Hardware). Für den Produktionsbetrieb. |
| `CONFIG_DERIVED` | Die Port-Namen werden direkt aus den `comIngredients` übernommen. Kein Betriebssystem-Query; nützlich für Tests ohne angeschlossene Hardware. |
| `FILE`           | Port-Namen werden aus einer separaten JSON-Datei gelesen (Pfad in `file`). Erlaubt eine zusätzliche Indirektionsebene, z.B. für Testszenarien mit wechselnden Port-Konfigurationen. |

> **Laufzeitverhalten bei `type = REAL`:** Beim Systemstart gleicht die Anwendung die konfigurierten `comIngredients` mit den vom Betriebssystem gemeldeten Ports ab. Ist ein konfigurierter Port zu diesem Zeitpunkt **nicht** im System vorhanden (z.B. USB-Adapter noch nicht eingesteckt), wird seine Ingredient-Zuordnung **im Arbeitsspeicher gelöscht** – die `configuration.json` auf der Festplatte bleibt unverändert. Als Folge behandelt der Dispenser die betroffenen Zutaten als manuelle Schritte, auch wenn sie in der Konfiguration einem Port zugeordnet sind. Die Admin-Port-Steuerung (`/admin/com-ports/{port}/on|off`) ist davon **nicht** betroffen, da sie Ports direkt über den Port-Namen anspricht und nicht über die Ingredient-Zuordnung.
>
> Diese Prüfung läuft nicht nur beim Systemstart, sondern auch bei jedem `POST /admin/reload-configuration` erneut. Das bedeutet: Ports, die nach dem letzten Start oder Reload neu angeschlossen wurden, werden beim nächsten Reload erkannt und ihre Ingredient-Zuordnung wiederhergestellt. Umgekehrt verlieren Ports, die inzwischen verschwunden sind (z.B. USB-Adapter abgezogen), ihre Zuordnung beim nächsten Reload erneut. Der Arbeitsspeicherzustand der Konfiguration spiegelt damit immer den Zeitpunkt des letzten Starts oder Reloads wider – nicht den aktuellen Hardware-Zustand.
>
> Bei `CONFIG_DERIVED` und `FILE` gilt dieses Verhalten nicht, da die Liste der verfügbaren Ports direkt aus der Konfiguration abgeleitet wird – alle konfigurierten Ports gelten per Definition als vorhanden.

**Beispiel:**
```json
"comPortProvider": {
  "type": "CONFIG_DERIVED",
  "file": null
}
```

---

#### `requireRecipeToken`

| Typ     | Standard | Beschreibung |
|---------|----------|--------------|
| `boolean` | `true` | Wenn `true`, muss ein Benutzer vor dem Abfüllen eines Rezepts einen vom Administrator generierten Einmal-Token vorweisen (`GET /admin/claim-recipe-token`). Auf `false` setzen, um den offenen Betrieb ohne Token-Pflicht zu erlauben. |

Der Wert kann zur Laufzeit über `POST /admin/set-recipe-token-required` geändert und anschließend per `POST /admin/save-configuration` dauerhaft gespeichert werden.

---

#### `ingredients`

Liste aller bekannten Zutaten des Systems. Jede Zutat hat einen Typ, der ihr Verhalten bei der Abfüllung bestimmt.

| Feld   | Typ     | Beschreibung |
|--------|---------|--------------|
| `type` | `string` | Zutatenkategorie: `LIQUID`, `VISCOUS`, `CRYSTAL` oder `ADDON` |
| `name` | `string` | Anzeigename in der Benutzeroberfläche |
| `uuid` | `string` (UUID) | Eindeutiger Bezeichner; wird in `comIngredients` und `recipes` referenziert |

**Zutatenkategorien:**

| Typ       | Typisches Beispiel           | Abfüllung |
|-----------|------------------------------|-----------|
| `LIQUID`  | Orangensaft, Tonic Water, Gin | Automatisch via Pumpe (COM-Port) für eine definierte Zeitdauer |
| `VISCOUS` | Grenadine, Sirup              | Normalerweise manuell (kein fließender Pumpenweg); kann optional auf COM gemappt werden |
| `CRYSTAL` | Zucker                        | Via Schrittmotor (Anzahl Umdrehungen); erfordert speziellen Controller |
| `ADDON`   | Limettenscheibe, Minzblatt   | Immer manueller Schritt; Benutzer bestätigt im Frontend |

**Beispiel:**
```json
{
  "type": "LIQUID",
  "name": "Tonic Water",
  "uuid": "10000000-0000-0000-0000-000000000003"
}
```

---

#### `comIngredients`

Verknüpft physische COM-Ports (= Pumpen) mit den logischen Zutaten und enthält den Kalibrierungswert.

| Feld          | Typ     | Beschreibung |
|---------------|---------|--------------|
| `uuid`        | UUID    | Eindeutige ID dieses Port-Ingredient-Mappings |
| `com`         | `string` | Portbezeichnung: unter Windows z.B. `COM4`, unter Linux z.B. `/dev/ttyUSB0` |
| `ingredient`  | UUID    | Referenz auf die UUID einer Zutat aus `ingredients` |
| `calibration` | `integer` | Kalibrierungswert in Millisekunden – gibt an, wie viele ms die Pumpe benötigt, um 1 ml zu fördern. Standardwert `1000` entspricht 1 s/ml. |

> **Hinweis zur Kalibrierung:** Der `calibration`-Wert wird beim Abfüllen mit dem `durationMilliseconds`-Wert eines Rezeptschritts ins Verhältnis gesetzt. Eine genaue Kalibrierung ist wichtig für reproduzierbare Getränkemengen. Zum Kalibrieren steht der Admin-Endpunkt `POST /admin/com-ports/{port}/pulse` zur Verfügung, mit dem einzelne Pumpen manuell angesteuert werden können.

**Beispiel:**
```json
{
  "uuid": "20000000-0000-0000-0000-000000000001",
  "com": "COM4",
  "ingredient": "10000000-0000-0000-0000-000000000002",
  "calibration": 1000
}
```

> Zutaten, die **keinen** Eintrag in `comIngredients` haben (z.B. `VISCOUS`, `ADDON`), werden vom System automatisch als **manuelle Schritte** behandelt: Der Benutzer wird im Frontend aufgefordert, die Zutat selbst hinzuzufügen und die Aktion zu bestätigen.
>
> Dasselbe gilt, wenn ein Eintrag zwar vorhanden ist, der Port beim Start aber nicht gefunden wurde (siehe Hinweis zu `comPortProvider.type = REAL` oben). In diesem Fall wartet das System still auf eine Benutzerbestätigung, die ohne Frontend-Interaktion nie eintrifft – das Rezept bleibt scheinbar am Anfang hängen.

---

#### `recipes` und `recipeIngredients`

Ein Rezept besteht aus Name, UUID und einer geordneten Liste von Zutatenschritten (`recipeIngredients`). Die Reihenfolge in der Liste bestimmt die Abfolge beim Abfüllen.

**Rezept-Felder:**

| Feld                | Typ     | Beschreibung |
|---------------------|---------|--------------|
| `name`              | `string` | Anzeigename in der Benutzeroberfläche |
| `uuid`              | UUID    | Eindeutige Rezept-ID |
| `recipeIngredients` | Array   | Geordnete Liste der Zutatenschritte |

**Zutatenschritte – nach Typ:**

**`LIQUID` (flüssige Zutat via Pumpe)**

```json
{
  "type": "LIQUID",
  "ingredientUUID": "10000000-0000-0000-0000-000000000002",
  "durationMilliseconds": 10400
}
```

| Feld                   | Beschreibung |
|------------------------|--------------|
| `ingredientUUID`       | Referenz auf die Zutat (muss in `comIngredients` gemappt sein) |
| `durationMilliseconds` | Pumpzeit in Millisekunden. Bestimmt die abgefüllte Menge in Kombination mit dem `calibration`-Wert des Ports. |

**`VISCOUS` (viskose Zutat)**

```json
{
  "type": "VISCOUS",
  "ingredientUUID": "10000000-0000-0000-0000-000000000005"
}
```

Kein `durationMilliseconds`; Schritt ist ohne COM-Mapping immer manuell.

**`CRYSTAL` (Schüttgut/Pulver via Schrittmotor)**

```json
{
  "type": "CRYSTAL",
  "ingredientUUID": "10000000-0000-0000-0000-000000000006",
  "rotations": 1
}
```

| Feld        | Beschreibung |
|-------------|--------------|
| `rotations` | Anzahl der Umdrehungen des Schrittmotors/Dosierers |

**`ADDON` (Garnitur, immer manuell)**

```json
{
  "type": "ADDON",
  "ingredientUUID": "10000000-0000-0000-0000-000000000007"
}
```

Kein zusätzliches Mengenfeld; der Benutzer bestätigt diesen Schritt manuell im Frontend.

---

## 6. Betrieb als systemd-Service auf dem Raspberry Pi

### Service-Datei erstellen

```bash
sudo vi /etc/systemd/system/smartmixer.service
```

Folgenden Inhalt einfügen:

```ini
[Unit]
Description=SmartMixer
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/SmartMixer
ExecStart=/home/pi/SmartMixer/bin/SmartMixer
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> **Wichtig:** `WorkingDirectory` muss auf das Verzeichnis zeigen, das die `configuration.json` enthält (d.h. das Verzeichnis, in das `backend/dist-arm/SmartMixer/` deployed wurde, zusammen mit einer `configuration.json`).

### Service aktivieren und starten

```bash
# Startskript ausführbar machen (falls noch nicht geschehen)
chmod +x /home/pi/SmartMixer/bin/SmartMixer

# systemd-Konfiguration neu laden
sudo systemctl daemon-reload

# Service beim Booten automatisch starten
sudo systemctl enable smartmixer

# Service sofort starten
sudo systemctl start smartmixer
```

### Serielle Ports freischalten

Damit der Benutzer `pi` auf USB-Serialadapter zugreifen darf, muss er der Gruppe `dialout` angehören:

```bash
sudo usermod -aG dialout pi
# Danach neu anmelden oder rebooten
```

Port-Namen unter Linux: Die unter Windows als `COM4`, `COM5` usw. konfigurierten Ports heißen auf dem Raspberry Pi typischerweise `/dev/ttyUSB0`, `/dev/ttyUSB1` usw. Die `comIngredients`-Einträge in `configuration.json` müssen entsprechend angepasst werden.

---

## 7. Nützliche Befehle

### 7.1 Bauen & Testen

| Befehl | Zweck |
|--------|-------|
| `.\mvnw.cmd test` | Unit- und Integrationstests ausführen |
| `.\mvnw.cmd clean package` | Kompilieren und JAR erzeugen (ohne Distribution) |
| `.\mvnw.cmd clean install -P distribution` | Windows-Distribution in `backend/dist/SmartMixer/` erzeugen |
| `.\mvnw.cmd clean install -P arm` | ARM64-Distribution in `backend/dist-arm/SmartMixer/` erzeugen |

### 7.2 Deployment (Raspberry Pi)

```bash
# Gesamtes App-Verzeichnis auf den Pi übertragen
rsync -av --delete backend/dist-arm/SmartMixer/ pi@<raspberry-ip>:/home/pi/SmartMixer/

# Konfiguration auf den Pi übertragen
scp configuration.json pi@<raspberry-ip>:/home/pi/SmartMixer/

# Service neu starten nach Deployment
ssh pi@<raspberry-ip> "sudo systemctl restart smartmixer"
```

### 7.3 Diagnose & Betrieb (Raspberry Pi)

**Service-Status und Logs:**

```bash
# Aktuellen Status des Services anzeigen
sudo systemctl status smartmixer

# Live-Log verfolgen (Ctrl+C zum Beenden)
sudo journalctl -u smartmixer -f

# Logs der letzten Stunde anzeigen
sudo journalctl -u smartmixer --since "1 hour ago"

# Logs seit dem letzten Neustart
sudo journalctl -u smartmixer -b

# Die letzten 50 Logeinträge anzeigen
sudo journalctl -u smartmixer -n 50
```

**Serielle Ports (Hardware-Diagnose):**

```bash
# Angeschlossene USB-Serialadapter anzeigen
ls /dev/ttyUSB* /dev/ttyACM*

# Kernel-Meldungen zu seriellen Geräten (nützlich beim Einstecken)
dmesg | grep -iE "tty|usb|ch34|cp210|ft232"

# USB-Geräte auflisten
lsusb

# Echtzeit-Kernel-Meldungen bei USB-Anschluss verfolgen
sudo dmesg -w | grep -iE "tty|usb"
```

**Prozess- und Netzwerkdiagnose:**

```bash
# Prüfen ob der SmartMixer-Prozess läuft
ps aux | grep SmartMixer

# Prüfen ob Port 8080 belegt ist
ss -tlnp | grep 8080

# HTTP-Erreichbarkeit lokal testen
curl -s http://localhost:8080/user/status
```

### 7.4 Diagnose & Betrieb (Windows)

**Service-Ports anzeigen:**

```powershell
# Belegte COM-Ports anzeigen (PowerShell)
Get-WmiObject Win32_PnPEntity | Where-Object { $_.Caption -match "COM\d" } | Select-Object Caption

# Port 8080 belegt?
netstat -ano | findstr :8080
```

**Anwendung manuell aus dem Distributions-Verzeichnis starten:**

```powershell
cd backend\dist\SmartMixer
.\SmartMixer.exe
```

### 7.5 Ermittlung benötigter Java-Module (Entwicklung)

Beim Hinzufügen neuer Maven-Abhängigkeiten kann sich die Menge benötigter Java-Module ändern. Der folgende Befehl analysiert alle JARs im Staging-Verzeichnis im ARM64-Container und gibt die minimale Modulliste aus:

```powershell
# Run from the repository root
docker run --rm --platform linux/arm64 `
  -v ${PWD}\backend\target\staging:/staging `
  eclipse-temurin:21-jdk `
  bash -c "jdeps --multi-release 21 --ignore-missing-deps --print-module-deps /staging/*.jar 2>/dev/null"
```

Das Ergebnis kann direkt in das `--add-modules`-Argument des `jlink`-Aufrufs im ARM-Profil (`pom.xml`) übernommen werden. Für die Windows-Distribution gilt analog `jdeps` lokal ausführen.

---

## 8. Aufzeichnungsmodus (Recording Mode)

### 8.1 Überblick

Der Aufzeichnungsmodus ermöglicht es einem Admin, die Abfüllzeiten eines Rezepts durch manuelles Steuern der Pumpen (Ein/Aus) zu kalibrieren und das Ergebnis als neues oder überarbeitetes Rezept zu speichern.

**Ablauf:**
1. Admin startet eine Session für ein bestehendes Rezept.
2. Für jede Zutat mit COM-Port-Zuordnung erhält der Admin eine direkte Port-Steuerung.
3. Der Admin kann den Port **beliebig oft** ein- und ausschalten (mehrere Zyklen = Feinjustierung).
4. Die **Gesamtzeit** einer Zutat ist die Summe aller Zyklus-Dauern.
5. Die **ursprüngliche Abfüllzeit** aus dem Quellrezept ist immer als Referenz sichtbar.
6. Nach der letzten Zutat kann die Session als Rezept gespeichert werden.

Zutaten ohne COM-Port (manuelle Schritte, Add-ons) werden übersprungen und nicht aufgezeichnet – sie werden im gespeicherten Rezept unverändert aus dem Quellrezept übernommen.

---

### 8.2 State-Machine-Erweiterung

Der neue State `RecordingIngredientState` ergänzt die bestehende State-Machine:

```
MixerDispenseState
  │
  │ POST /admin/recording/start/{recipeUuid}
  ▼
RecordingIngredientState  ◄─────────────────────────────────────────────────┐
  │ (Schritt N)                                                              │
  │  POST /admin/recording/ingredient/start  → Port ein, Zyklus läuft       │
  │  POST /admin/recording/ingredient/stop   → Port aus, Zyklus endet       │
  │  (beliebig oft wiederholbar)                                             │
  │                                                                          │
  │ POST /admin/recording/ingredient/next                                    │
  │  wenn noch weitere Schritte vorhanden ──────────────────────────────────┘
  │  wenn letzter Schritt
  ▼
MixerDispenseState
  │ (Session ist complete = true, liegt im Mixer bereit)
  │
  ├── POST /admin/recording/save  → Rezept gespeichert, Session gelöscht
  └── POST /admin/recording/abort → Session verworfen
```

Der `RecordingIngredientState` implementiert nur die recording-spezifischen Methoden aus `MixerStateInternal`. Alle anderen Operationen (Dispense, Priming etc.) werfen `UnsupportedOperationException`.

---

### 8.3 API-Endpunkte

Alle Endpunkte erfordern `?adminToken=<passwort>` (bestehende Admin-Authentifizierung).

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `POST` | `/admin/recording/start/{recipeUuid}` | Session starten; Response: Session-Objekt mit erstem Schritt |
| `POST` | `/admin/recording/ingredient/start` | Port einschalten; Response: `startedAt` (Epoch ms) + Zyklus-Index |
| `POST` | `/admin/recording/ingredient/stop` | Port ausschalten; Response: `startedAt`, `stoppedAt`, `cycleDurationMs`, `totalDurationMs`, `originalDurationMs` |
| `POST` | `/admin/recording/ingredient/next` | Schritt abschließen, nächste Zutat oder Session beenden; Response: `sessionComplete`, `currentStep` |
| `GET`  | `/admin/recording/session` | Vollständiger Session-Zustand inkl. aller Zyklen (Polling / Reload) |
| `POST` | `/admin/recording/save` | Session als Rezept speichern; Body: `{ recipeName, replaceSourceRecipe }` |
| `POST` | `/admin/recording/abort` | Aufzeichnung abbrechen, Session verwerfen |

**Wichtig zum `ingredient/start`-Endpunkt:** Kann mehrfach pro Zutat aufgerufen werden. Jeder Aufruf startet einen neuen Zyklus. Zwischen zwei `start`-Aufrufen muss ein `stop` erfolgen.

---

### 8.4 Zeitberechnung

Die Gesamtabfüllzeit einer Zutat ergibt sich aus der **Summe aller Ein/Aus-Zyklen**:

```
totalDurationMs = Σ (stoppedAt_i - startedAt_i)  für alle abgeschlossenen Zyklen
               + (now - startedAt_laufend)        falls ein Zyklus noch läuft
```

Alle Timestamps (`startedAt`, `stoppedAt`) sind **serverseitige Epoch-Millisekunden**.
Der Server liefert nach jedem `stop`-Aufruf das aktuelle `totalDurationMs` direkt in der Response.

Für den Vergleich mit dem Quellrezept liefert jede Response `originalDurationMs`:
- Bei `LiquidRecipeIngredient`: das `durationMilliseconds`-Feld des Quellrezepts
- Bei anderen Typen: `null`

---

### 8.5 Neue Klassen & Pakete

| Klasse / Datei | Paket | Beschreibung |
|---|---|---|
| `OnOffCycle` | `mixer.recording` | Ein einzelner Ein/Aus-Zyklus mit `startedAt`, `stoppedAt` |
| `RecordingStep` | `mixer.recording` | Schritt für eine Zutat: enthält Liste von `OnOffCycle`, `originalDurationMs` |
| `RecordingSession` | `mixer.recording` | Gesamte Session: Quellrezept, Liste aller Schritte, aktueller Index |
| `RecordingIngredientState` | `mixer` | State während aktiver Aufzeichnung |
| `StartRecordingSessionUseCase` | `usecase.admin` | Session starten, COM-Port-Zutaten filtern |
| `StartRecordingIngredientUseCase` | `usecase.admin` | Port einschalten, Zyklus starten |
| `StopRecordingIngredientUseCase` | `usecase.admin` | Port ausschalten, Zyklus beenden |
| `NextRecordingIngredientUseCase` | `usecase.admin` | Schritt abschließen, vorwärts schalten |
| `GetRecordingSessionUseCase` | `usecase.admin` | Session-Zustand abfragen |
| `SaveRecordedRecipeUseCase` | `usecase.admin` | Aufgezeichnete Zeiten als Rezept speichern |
| `AbortRecordingUseCase` | `usecase.admin` | Session abbrechen, Port stoppen |

**Erweiterungen bestehender Klassen:**

| Klasse | Änderung |
|---|---|
| `Mixer` | Feld `activeRecordingSession`; Methoden `startRecording`, `startRecordingIngredient`, `stopRecordingIngredient`, `nextRecordingIngredient`, `abortRecording`, `addAndSaveRecipe`, `replaceAndSaveRecipe`, `findComPortNameForIngredient` |
| `MixerStateInternal` | Default-Methoden für alle 5 recording-Operationen (werfen `UnsupportedOperationException`) |
| `MixerDispenseState` | Implementierung von `startRecording` |
| `Configuration` | Methoden `addRecipe`, `replaceRecipe` |
| `AdminController` | 7 neue Handler-Methoden für Recording-Endpunkte |
| `MixerApp` | 7 neue Route-Registrierungen unter `/admin/recording/...` |

---

*Dokumentation generiert für SmartMixer v0.0.1-SNAPSHOT – Stand Mai 2026*
