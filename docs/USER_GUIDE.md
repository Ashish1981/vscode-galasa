# Galasa for VS Code — User Guide

This is the complete reference for the Galasa Visual Studio Code extension: every command, every setting, and the workflows for using it against **local-only** environments, **distributed (non-Z) ecosystems**, and **z/OS (Z host) ecosystems** including 3270 / SimBank.

> Looking for a quick start? See [README.md](../README.md) first. This guide is the deep reference.

---

## Table of contents

1. [Concepts and terminology](#1-concepts-and-terminology)
2. [Prerequisites](#2-prerequisites)
3. [Installing the extension](#3-installing-the-extension)
4. [Configuration model](#4-configuration-model)
5. [Settings reference (all 20 settings)](#5-settings-reference)
6. [Galasa sidebar — views and welcome screens](#6-sidebar-views)
7. [Status bar and Diagnostics](#7-status-bar-and-diagnostics)
8. [Authoring and debugging tests locally](#8-authoring-and-debugging-tests-locally)
9. [Working with the local Galasa home (`~/.galasa`)](#9-local-galasa-home)
9b. [**Writing real tests using properties files**](#9b-writing-real-tests-using-properties-files) ← start here for SimBank / Z / Docker recipes
10. [Connecting to a remote ecosystem](#10-connecting-to-an-ecosystem)
11. [Z host (mainframe) workflows](#11-z-host-workflows)
12. [Non-Z host (distributed) workflows](#12-non-z-host-workflows)
13. [Hybrid / cloud-only workflows](#13-hybrid-workflows)
14. [Command reference (all 57 commands)](#14-command-reference)
15. [Java compatibility (8 → 26)](#15-java-compatibility)
16. [VS Code backward compatibility](#16-vs-code-backward-compatibility)
17. [Troubleshooting](#17-troubleshooting)
18. [Security considerations](#18-security-considerations)
19. [Appendix — environment variables](#19-environment-variables)
20. [Appendix — running automated tests](#20-running-tests)

---

## 1. Concepts and terminology

| Term | Meaning |
|------|---------|
| **`galasactl`** | The Galasa command-line tool. The extension shells out to it for every "ecosystem-side" operation (auth, runs, properties, secrets, etc.). [Upstream source](https://github.com/galasa-dev/galasa/tree/main/modules/cli). |
| **GALASA_HOME** | A directory (default `~/.galasa`) holding bootstrap, credentials, RAS, overrides, properties, and named environments. |
| **RAS** | Result Archive Store — the location where a run's logs, screen captures and structured artifacts are persisted. The extension's *Local Runs* view browses the local RAS. |
| **Bootstrap** | A `bootstrap.properties` file (or HTTPS URL) telling Galasa where to find the ecosystem services and CPS. |
| **CPS** | Configuration Property Store — the keyed configuration backing every Galasa run. |
| **OBR** | OSGi Bundle Repository pointing to test bundles. Galasa loads tests through an "uber OBR" plus per-test bundles. |
| **Manager** | A reusable Galasa component that talks to a particular target (zOS / CICS / IMS / Docker / k8s / HTTP / etc.). |
| **Stream** | A named set of test bundles available to runs. Used in portfolios and in `runs prepare`. |
| **Portfolio** | A YAML file listing test classes to submit as a batch. |
| **Z host** | An IBM Z (z/OS) target — typically driven through the `zos`, `zos3270`, `zosmf`, `cics*`, `ims*`, `mq*` Galasa managers. |
| **Non-Z host** | Distributed targets: Linux/Windows/macOS, Docker, Kubernetes, Selenium, HTTP, JDBC. |

---

## 2. Prerequisites

| Component | Required | Notes |
|-----------|---------:|-------|
| **VS Code** | ≥ 1.116 | The extension declares `engines.vscode: ^1.116.0` (current and the two prior minor releases). |
| **Java JDK** | 8 — 26 | Any major distribution (Temurin, Zulu, Corretto, Microsoft Build, Liberica, Oracle, Semeru). The extension auto-detects and injects JDK-9+ `--add-opens`, JDK-17 `-Djava.security.manager=allow`, and JDK-21 self-attach flags as needed. |
| **Maven** | ≥ 3.6 compatible with the JDK | Required for OBR build, project scaffolding, and Java debug session classpath. |
| **`galasactl`** | Optional but **strongly recommended** | Required for everything in §10–§13. Install from the [Galasa CLI release page](https://github.com/galasa-dev/galasa/releases) or via Homebrew (`brew install galasa-dev/tap/galasactl`). |
| **Java Extension Pack** | Auto-installed | Hard dependency declared via `extensionDependencies`. |
| **Node** (for contributors only) | ≥ 24 | Only relevant if you build/test the extension itself. |

---

## 3. Installing the extension

**From VSIX (any platform):**
```bash
code --install-extension galasa-plugin-<version>.vsix
```

**From Marketplace / Open VSX:** search for *Galasa* and click **Install**.

**Workspace setup that VS Code performs automatically:**
- Activates the Java Extension Pack.
- Runs the extension's activation logic on first debug session, command invocation or sidebar open.
- Validates the detected JDK (status bar warns if outside 8–26).
- Creates `~/.galasa/vscode/` on first activation if it does not exist.

---

## 4. Configuration model

The extension reads three layers, in order of precedence (highest first):

1. **Workspace `.vscode/settings.json`** — per-project overrides.
2. **User settings** — open with `Ctrl+,` / `Cmd+,`, search "galasa".
3. **Defaults** declared in `package.json`.

Java and `GALASA_HOME` additionally fall back to environment variables when the corresponding setting is empty:

```
galasa.javaHome → java.home (Red Hat) → JAVA_HOME → PATH
galasa.home     → GALASA_HOME → ~/.galasa
galasa.bootstrap → GALASA_BOOTSTRAP → (none)
```

---

## 5. Settings reference

All 20 settings, grouped by purpose. Defaults shown after the `=`.

### 5.1 Java + CLI runtime

| Setting | Default | Purpose |
|---------|---------|---------|
| `galasa.javaHome` | `""` | Path to a JDK installation (the directory containing `bin/java`, **not** `bin/java` itself). Java 8–26 supported. Falls back to `java.home` → `JAVA_HOME` → `PATH`. |
| `galasa.cliPath` | `""` | Path to `galasactl` (or its containing directory). If empty, uses the executable on `PATH`. On Windows the extension automatically appends `.exe`. |
| `galasa.cliTimeoutMs` | `120000` | Timeout for non-interactive `galasactl` calls. Set `0` to disable. Timed-out calls return exit code `-2` and a `Timed out after Nms` stderr line. |
| `galasa.home` | `""` | Override for `GALASA_HOME`. If empty, defaults to `GALASA_HOME` env var, else `~/.galasa`. |

### 5.2 Ecosystem identity

| Setting | Default | Purpose |
|---------|---------|---------|
| `galasa.bootstrap` | `""` | `file://...` or `https://.../bootstrap.properties` URL. Empty ⇒ `file://${galasa.home}/bootstrap.properties`. Also propagated as `GALASA_BOOTSTRAP` to spawned `galasactl` processes. |
| `galasa.requestor` | `"unknown"` | Value injected as `framework.run.requestor` override; appears in the RAS as the *requestor* of every locally-launched run. Use your e-mail or RACF/AD username. |
| `galasa.overrides` | `true` | When `true`, the contents of `~/.galasa/overrides.properties` are merged into the per-run override file before each local debug session. Disable to run with a clean override set. |

### 5.3 Maven / dependency resolution

| Setting | Default | Purpose |
|---------|---------|---------|
| `galasa.maven-remote` | `https://repo.maven.apache.org/maven2/` | Public Maven repository used to resolve Galasa managers and test dependencies. Set this to your enterprise Artifactory / Nexus URL when behind a firewall. |
| `galasa.maven-local` | `""` | A local file-system Maven cache to consult **before** the remote repo. Useful for air-gapped environments. |
| `galasa.version` | `"LATEST"` | Galasa framework version to embed when building a per-run uber OBR. `LATEST` = use the extension's `symbolicversion`. Otherwise pin to e.g. `0.42.0`. |

### 5.4 Local debug launch

| Setting | Default | Purpose |
|---------|---------|---------|
| `galasa.bootJarPath` | `""` | **Required for local debug.** Absolute path to the Galasa boot jar (the one containing the launcher main class). |
| `galasa.bootLauncherMainClass` | `""` | **Required for local debug.** The boot jar's launcher entry point — typically `dev.galasa.boot.Launcher`. |
| `galasa.uberObr` | `""` | Optional `mvn:` coordinate (`mvn:group/artifact/version/obr`) of an uber OBR to load before the per-workspace OBR. Leave empty to use only the workspace OBR. |
| `galasa.testAnnotation` | `"@Test"` | Marker the extension uses to detect test methods in Java sources. Change if your team uses a custom annotation alias. |
| `galasa.testAnnotationImport` | `""` | Optional fully-qualified import that must be present alongside the annotation (e.g. `dev.galasa.Test`). Leave empty to skip the import check. |

### 5.5 SimBank + bundled examples

| Setting | Default | Purpose |
|---------|---------|---------|
| `galasa.simbankJarPath` | `""` | Absolute path to the SimBank distribution jar. Required for the *Launch Simbank* command. |
| `galasa.examplesArchivePath` | `""` | Absolute path to a zip archive containing example Galasa projects. |
| `galasa.examplePackagePrefix` | `""` | Java package prefix used in the bundled examples (e.g. `dev.galasa.simbank`). The extension uses this prefix to detect example projects in the archive. |
| `galasa.exampleSubdirectories` | `["manager","tests"]` | Subdirectory suffixes scaffolded for each example project. |
| `galasa.examplePomPlaceholder` | `"%%prefix%%"` | Token in `pom-example.xml` replaced with the user-chosen package name. |

### 5.6 Example workspace `settings.json`

Local-only with bundled SimBank, behind a corporate Maven proxy:

```jsonc
{
    "galasa.javaHome": "/opt/jdk-21",
    "galasa.cliPath": "/opt/galasa/bin/galasactl",
    "galasa.maven-remote": "https://artifactory.example.com/maven-public",
    "galasa.maven-local": "/home/me/.m2/repository",
    "galasa.bootJarPath": "/opt/galasa/0.42.0/galasa-boot-0.42.0.jar",
    "galasa.bootLauncherMainClass": "dev.galasa.boot.Launcher",
    "galasa.uberObr": "mvn:dev.galasa/dev.galasa.uber.obr/0.42.0/obr",
    "galasa.simbankJarPath": "/opt/galasa/0.42.0/galasa-simplatform-0.42.0.jar",
    "galasa.examplesArchivePath": "/opt/galasa/0.42.0/galasa-simbank-tests.zip",
    "galasa.examplePackagePrefix": "dev.galasa.simbank",
    "galasa.requestor": "alice@example.com"
}
```

Connecting to a remote ecosystem:

```jsonc
{
    "galasa.javaHome": "/opt/jdk-21",
    "galasa.cliPath": "/opt/galasa/bin/galasactl",
    "galasa.bootstrap": "https://galasa.example.com/api/bootstrap",
    "galasa.home": "/home/me/.galasa-prod",
    "galasa.cliTimeoutMs": 300000
}
```

---

## 6. Sidebar views

Open the **Galasa** activity bar entry (left rail) to see three views:

| View | Provider | Behaviour |
|------|----------|-----------|
| **Environment Properties** (`galasa-environment`) | reads `${galasa.home}/vscode/*.properties` | Each `.properties` file becomes a named environment; one can be active at a time. The active environment's content is merged into per-run overrides. |
| **Local Runs** (`galasa-ras`) | reads `${galasa.home}/ras/<run>` | Each finished run appears as a node with its result. Right-click a run → *Run Log* / *Delete*. |
| **Artifacts** (`galasa-artifacts`) | populated when a run is opened | Browse the run's structured artifacts. Files ending in `.gz` open in the embedded 3270 *Terminal Screen* viewer. |

**Welcome screens** appear when these views are empty:
- *Environment Properties* prompts for **Add Environment** and **Run Diagnostics**.
- *Local Runs* prompts for **Initialize Galasa Home**, **Submit Local Run**, and **Run Diagnostics**.

---

## 7. Status bar and Diagnostics

A right-hand status bar item shows Java health:

| State | Indicator |
|-------|-----------|
| Java in range (8–26) | `$(check) Galasa: Java <N>` |
| Detected, out of range | `$(warning) Galasa: Java <N> unsupported` (orange background) |
| Not detected | `$(warning) Galasa: no Java` (orange background) |

Click the item to run **Galasa: Diagnostics** (`galasa.diagnostics`) — a one-shot health report printed to the *Galasa* output channel:

```
=== Galasa Diagnostics ===
Extension version : 0.15.0

-- Java --
  Major version    : 21
  Source           : JAVA_HOME
  Path             : /opt/jdk-21/bin/java
  Supported        : yes

-- CLI (galasactl) --
  Configured       : /opt/galasa/bin/galasactl
  Resolved exe     : /opt/galasa/bin/galasactl
  Available        : yes
  --version output : galasactl 0.45.0

-- Galasa Home --
  GALASA_HOME      : /home/me/.galasa
  Exists           : yes
  Bootstrap        : https://galasa.example.com/api/bootstrap
```

Run this before opening any support ticket.

---

## 8. Authoring and debugging tests locally

### 8.1 Recognising a test

The extension treats the active document as a Galasa test if **either**:
- it ends in `.java`, contains `galasa.testAnnotation` (default `@Test`), and — if `galasa.testAnnotationImport` is set — also contains that import; **or**
- it ends in `.feature` and contains `Feature:` (Gherkin).

A *CodeLens* over each detected test gives a one-click **Debug** action.

### 8.2 The debug flow

1. Run **Galasa: Local - Init** (`galasa.local.init`) once to seed `~/.galasa`. Skip if you already use `galasactl`.
2. Configure `galasa.bootJarPath` and `galasa.bootLauncherMainClass`.
3. (Optional) Set `galasa.uberObr` to an OBR Maven coord.
4. Open a Java test file → click the **Debug Galasa test locally** action (CodeLens or the editor title-bar icon).
5. The extension:
   - builds a per-workspace OBR from each `pom.xml` next to a `MANIFEST.MF`,
   - merges `~/.galasa/overrides.properties` (if `galasa.overrides=true`) plus the active environment's properties into a generated overrides file,
   - composes the boot CLI: `<bootJar> --bootstrap <bootstrap> --overrides <file> --obr <workspace> [--obr <uber>] --test <bundle>/<class>`,
   - injects the per-Java-version VM args,
   - launches a `java` debug session via the Red Hat Java extension.

### 8.3 Exporting a launch.json entry

**Galasa Export launch.json** (`galasa-test.export`) writes the current test (or feature file) into `${workspaceFolder}/.vscode/launch.json` so you can debug it without opening the source. It uses the `galasa` debug type contributed by the extension.

### 8.4 Running Gherkin features

Gherkin `.feature` files are debugged the same way — the extension passes `--gherkin <file-uri>` to the launcher instead of `--test <bundle>/<class>`.

---

## 9. Local Galasa home

The extension treats `~/.galasa` (or `galasa.home`) as the source of truth for:

| File / dir | Used for |
|------------|----------|
| `bootstrap.properties` | Default bootstrap if `galasa.bootstrap` is empty. |
| `overrides.properties` | User-wide overrides applied to every local run when `galasa.overrides=true`. |
| `credentials.properties` | Secrets store referenced by `framework.credentials.store`. |
| `cps.properties` | Local CPS, used by managers when no remote CPS configured. |
| `vscode/*.properties` | Per-environment override sets (managed by the *Environment Properties* sidebar). |
| `ras/<run-id>/` | Result Archive Store for locally-launched runs. |

**Adding a named environment** — via the sidebar's **+** button or **Galasa: Local - Init** then *Add Environment*. Each environment is one `.properties` file whose first line is `# <name>`. Activating it merges its contents into every subsequent local run's overrides.

---

## 9b. Writing real tests using properties files

Galasa tests are configured **entirely** through Java-style `.properties` files. The extension touches the following four files; understanding which goes where is the difference between a test that runs on someone else's laptop and one that doesn't.

### 9b.1 The four properties files

| File | Path | What goes in it | Lifetime |
|------|------|-----------------|----------|
| **bootstrap.properties** | `${galasa.home}/bootstrap.properties` (or set via `galasa.bootstrap`) | Where the framework finds the CPS, RAS, credentials store. | Edit once per environment. |
| **cps.properties** | `${galasa.home}/cps.properties` | The Configuration Property Store: per-manager configuration keys (zos image names, Docker engines, Selenium grid endpoints, …). | Edit per project + per target. |
| **overrides.properties** | `${galasa.home}/overrides.properties` (merged when `galasa.overrides=true`) | One-off overrides applied on top of CPS for a single run / debug session. | Edit when you need to redirect a single run to a different host. |
| **credentials.properties** | `${galasa.home}/credentials.properties` | Plain-text usernames / passwords / tokens referenced by `secure.credentials.<id>.username/password`. | File-mode `600`. Never commit. |

The extension also lets you maintain **named environment files** under `${galasa.home}/vscode/<name>.galenv` (managed via the **Environment Properties** sidebar). The currently active one is merged into the per-run overrides on every local debug launch — so you can keep separate `dev`, `staging`, `prod` property sets and toggle between them with one click.

### 9b.2 Anatomy of a CPS key

CPS keys follow the convention:

```
<namespace>.<scope>.<id>.<key> = <value>
```

| Part | Meaning |
|------|---------|
| `namespace` | The manager (e.g. `zos`, `zos3270`, `cics`, `docker`, `selenium`, `http`, `framework`). |
| `scope` | A discriminator the manager understands. For zOS: `cluster` / `image` / `sysplex`. For docker: `engine`. |
| `id` | Your team's name for that scope (e.g. `PLEX1`, `MV2A`, `LOCAL`). |
| `key` | Manager-defined property (`hostname`, `port`, `default.hostname`, `images`, etc.). |

The exact keys per manager are in the [Galasa managers reference](https://github.com/galasa-dev/galasa/tree/main/modules/managers).

### 9b.3 Recipe — z/OS test against a real LPAR

`~/.galasa/cps.properties`:

```properties
# Cluster definition
zos.cluster.PLEX1.images=MV2A,MV2B

# Image MV2A
zos.image.MV2A.default.hostname=mv2a.example.com
zos.image.MV2A.ipv4.hostname=mv2a.example.com
zos.image.MV2A.zosmf.server=MV2A
zos.image.MV2A.credentials=MV2A
zos.image.MV2A.sysname=MV2A

# z/OSMF
zosmf.server.MV2A.images=MV2A
zosmf.server.MV2A.https=true
zosmf.server.MV2A.port=443

# 3270
zos3270.tls=true
zos3270.image.MV2A.host=mv2a.example.com
zos3270.image.MV2A.port=23
```

`~/.galasa/credentials.properties` (file-mode `600`):

```properties
secure.credentials.MV2A.username=TSOUSER
secure.credentials.MV2A.password=changeit
```

In the test class:

```java
@Test
public class MyZosTest {
    @ZosImage(imageTag = "PRIMARY")
    public IZosImage primary;

    @Test
    public void itLogsOn() throws Exception {
        // primary is now bound to MV2A through the CPS keys above.
    }
}
```

`~/.galasa/overrides.properties` — pin which image gets resolved for tag `PRIMARY` for **this** run only:

```properties
zos.image.IMAGE_TAG_PRIMARY=MV2A
```

### 9b.4 Recipe — local Docker target

`~/.galasa/cps.properties`:

```properties
docker.engines=LOCAL
docker.engine.LOCAL.hostname=localhost
docker.engine.LOCAL.port=2375
docker.engine.LOCAL.tls.enabled=false
```

In the test class:

```java
@DockerContainer(image = "nginx:latest", containerTag = "WEB")
public IDockerContainer web;
```

### 9b.5 Recipe — Selenium WebDriver against a Grid

`~/.galasa/cps.properties`:

```properties
selenium.grid.endpoint=https://selenium-grid.example.com
selenium.driver.type=chrome
selenium.driver.chrome.maxConnections=2
```

`~/.galasa/credentials.properties`:

```properties
secure.credentials.SELENIUM.token=eyJhbGciOi...
```

### 9b.6 Recipe — generic HTTP target

`~/.galasa/cps.properties`:

```properties
http.endpoint.MYAPI.url=https://api.example.com
http.endpoint.MYAPI.credentials=MYAPI
```

`~/.galasa/credentials.properties`:

```properties
secure.credentials.MYAPI.username=svc-account
secure.credentials.MYAPI.password=...
```

### 9b.7 Switching between environments per debug session

1. Open the **Galasa** activity bar → **Environment Properties** view.
2. Click **+** (Add Environment) → name it `dev` / `staging` / `prod`.
3. Edit the resulting file under `${galasa.home}/vscode/<name>.galenv` — populate it with overrides like:
   ```properties
   # dev
   zos.image.IMAGE_TAG_PRIMARY=MV2A
   docker.engine.LOCAL.hostname=docker-dev.example.com
   ```
4. Right-click the environment in the sidebar → **Set Active**.
5. Press the **Debug Galasa test locally** code-lens. The active environment's properties are merged into the generated overrides file before the launcher boots.

### 9b.8 Where to put which key — quick rule

| If the key… | Put it in |
|-------------|-----------|
| Describes the **target system** (host, port, manager defaults) | `cps.properties` |
| Is a **secret** | `credentials.properties` |
| Is a **per-run override** (e.g. point this one run at a different image) | `overrides.properties` |
| Should toggle with the active sidebar environment (dev/staging/prod) | `${galasa.home}/vscode/<name>.galenv` |
| Tells the framework where to find its CPS / RAS / credentials store | `bootstrap.properties` |

### 9b.9 Editing tips inside VS Code

- The extension contributes the **galenv** language and snippets to `.galenv` files — open one and start typing to see suggested CPS keys.
- Use **Galasa: Properties - Set** (`galasa.properties.set`) when you want a property to live in the *ecosystem* CPS rather than your local `cps.properties`.
- Use **Galasa: Secrets - Set** (`galasa.secrets.set`) for ecosystem-side secrets — never push `credentials.properties` to the ecosystem.

---

## 10. Connecting to an ecosystem

A Galasa "ecosystem" is the deployed server-side: API, RAS, CPS store and resource controllers (typically on Kubernetes — see [galasa-dev/helm](https://github.com/galasa-dev/helm)).

### 10.1 Pointing at it

Set `galasa.bootstrap` to your ecosystem's bootstrap URL. The CLI also reads `GALASA_BOOTSTRAP`; the extension exports both.

```jsonc
{
    "galasa.bootstrap": "https://galasa.example.com/api/bootstrap"
}
```

### 10.2 Authenticating

| Step | Command |
|------|---------|
| Open a browser to the auth URL | **Galasa: Auth - Login** (`galasa.auth.login`) |
| Verify you're authenticated | **Galasa: Auth - Status** (`galasa.auth.status`) — exit 0 ⇒ authenticated |
| List your tokens | **Galasa: Auth - List Tokens** (`galasa.auth.tokens.get`) |
| Revoke a token | **Galasa: Auth - Revoke Token** (`galasa.auth.tokens.delete`) |
| Sign out | **Galasa: Auth - Logout** (`galasa.auth.logout`) |

### 10.3 Running tests

| Outcome | Command |
|---------|---------|
| Build a portfolio (YAML) of tests for a stream | **Galasa: Runs - Prepare Portfolio** (`galasa.runs.prepare`) |
| Submit a portfolio to the ecosystem | **Galasa: Runs - Submit Portfolio** (`galasa.runs.submit`) |
| Submit one local test class | **Galasa: Runs - Submit Local** (`galasa.runs.submitLocal`) |
| Inspect a run | **Galasa: Runs - Get** (`galasa.runs.get`) |
| Live-stream a run's raw log | **Galasa: Runs - Tail** (`galasa.runs.tail`) |
| Download a run's artifacts | **Galasa: Runs - Download Artifacts** (`galasa.runs.download`) |
| Reset a stuck run | **Galasa: Runs - Reset** (`galasa.runs.reset`) |
| Cancel an in-flight run | **Galasa: Runs - Cancel** (`galasa.runs.cancel`) |
| Update a run's status / result fields | **Galasa: Runs - Update** (`galasa.runs.update`) |
| Bulk delete | **Galasa: Runs - Delete (Bulk)** (`galasa.runs.deleteBulk`) — accepts comma- or whitespace-separated names |
| Sweep finished runs from the ecosystem | **Galasa: Runs - Cleanup** (`galasa.runs.cleanup`) |
| Sweep local-only run history | **Galasa: Runs - Cleanup Local** (`galasa.runs.cleanupLocal`) |

### 10.4 Administering the ecosystem

| Subject | Get | Set / create | Delete |
|---------|-----|--------------|--------|
| **Properties** | `galasa.properties.get` (with `galasa.properties.namespaces.get` for namespaces) | `galasa.properties.set` | `galasa.properties.delete` |
| **Resources (apply / create / update / delete YAML)** | — | `galasa.resources.{apply,create,update}` | `galasa.resources.delete` |
| **Secrets** | `galasa.secrets.get` | `galasa.secrets.set` | `galasa.secrets.delete` |
| **Monitors** | `galasa.monitors.get` | `galasa.monitors.set` | — |
| **Roles** | `galasa.roles.get` | (server-side) | (server-side) |
| **Users** | `galasa.users.get` | `galasa.users.set` (assign role) | `galasa.users.delete` |
| **Streams** | `galasa.streams.get` | `galasa.streams.set` | `galasa.streams.delete` |
| **Tags** | `galasa.tags.get` | `galasa.tags.set` | `galasa.tags.delete` |

### 10.5 What the extension passes to `galasactl`

For every non-`local` invocation:
- `--bootstrap <galasa.bootstrap>` (or `GALASA_BOOTSTRAP`) is appended automatically.
- `--galasahome <galasa.home>` is appended automatically.
- `GALASA_HOME` and `GALASA_BOOTSTRAP` are also exported as env vars.
- The CLI's stdout/stderr is mirrored to the *Galasa* output channel and (on non-zero exit) surfaced as a VS Code error notification.
- Long-running calls are killed after `galasa.cliTimeoutMs` (default 120s).

---

## 11. Z host workflows

When tests run against IBM Z (z/OS), Galasa drives them through the `zos`, `zos3270`, `zosmf`, `cics*`, `ims*`, `mq*`, and `db2*` managers. The VS Code extension's role is to:

- launch and debug the test locally (so you can break-point into manager calls), or
- submit it to an ecosystem that is itself zOS-aware, or
- run SimBank as a stand-in for a real LPAR.

### 11.1 Running SimBank locally

[SimBank](https://github.com/galasa-dev/simplatform) is a JVM-hosted simulation of CICS terminals + a bank application. It is the canonical Z-style target you can run on a laptop.

#### 11.1.a Acquire the artifacts

The extension does **not** ship the SimBank jar or the examples archive — they are released alongside Galasa itself. To download them:

1. Visit the [Galasa releases page](https://github.com/galasa-dev/galasa/releases).
2. Pick a version (e.g. `0.42.0`).
3. From the `modules/simplatform/` and `modules/simplatform-tests/` assets, download:
   - `galasa-simplatform-<version>.jar`
   - `galasa-simbank-tests-<version>.zip`
4. Move them somewhere stable, e.g.:
   - Linux/macOS: `/opt/galasa/<version>/`
   - Windows: `C:\Program Files\galasa\<version>\`

#### 11.1.b Tell the extension where they are

Open VS Code Settings (`Ctrl+,`) → search **"galasa simbank"** → fill in:

| Setting | Example value |
|---------|---------------|
| `galasa.simbankJarPath` | `/opt/galasa/0.42.0/galasa-simplatform-0.42.0.jar` |
| `galasa.examplesArchivePath` | `/opt/galasa/0.42.0/galasa-simbank-tests-0.42.0.zip` |
| `galasa.examplePackagePrefix` | `dev.galasa.simbank` |
| `galasa.bootJarPath` | `/opt/galasa/0.42.0/galasa-boot-0.42.0.jar` |
| `galasa.bootLauncherMainClass` | `dev.galasa.boot.Launcher` |
| `galasa.uberObr` | `mvn:dev.galasa/dev.galasa.uber.obr/0.42.0/obr` |

> The error notifications **Cannot create examples…** and **Cannot launch Simbank…** include direct **Open Settings** and **Download Galasa** buttons that take you straight to the right place.

#### 11.1.c Run it

1. Run **Create SimBank Examples** (`galasa-test.createExamples`) → enter a package name (or accept the default `dev.galasa.simbank`). The extension extracts the example projects into your workspace.
2. Run **Launch Simbank** (`galasa-test.simbank`) → opens a terminal running the SimBank jar with the appropriate `--add-opens` flags for your JDK.
3. Open one of the generated SimBank tests (e.g. `BasicAccountCreditTest.java`) and click **Debug Galasa test locally** in the editor title bar (or the CodeLens above the class).
4. Watch the **Local Runs** sidebar populate when the run finishes. Right-click the new run → **Run Log** to inspect.

### 11.2 Connecting to a real z/OS LPAR

Set up CPS / overrides to describe your LPAR. The extension itself doesn't know about z/OS — it just propagates whatever the managers need. Typical keys:

```properties
zos.cluster.PLEX1.images=MV2A,MV2B
zos.image.MV2A.default.hostname=mv2a.example.com
zos.image.MV2A.ipv4.hostname=mv2a.example.com
zos.image.MV2A.zosmf.server=mv2a-zosmf
zosmf.server.MV2A.images=MV2A
zosmf.server.MV2A.https=true
zos3270.tls=true
```

Then put credentials in `~/.galasa/credentials.properties`:

```properties
secure.credentials.MV2A.username=tsouser
secure.credentials.MV2A.password=...
```

Or push them to the ecosystem with **Galasa: Secrets - Set** (`galasa.secrets.set`).

### 11.3 Browsing 3270 screen captures

After a Z-host run completes, its RAS contains `.gz`-compressed 3270 screen images. Click any `.gz` file in the **Artifacts** view → the embedded **Terminal Screen** viewer renders the captured screen with field highlighting and color theming that follows your VS Code theme.

### 11.4 Recommended settings for Z host development

```jsonc
{
    "galasa.javaHome": "/opt/ibm-semeru-21",
    "galasa.cliPath": "/opt/galasa/bin/galasactl",
    "galasa.bootJarPath": "/opt/galasa/0.42.0/galasa-boot-0.42.0.jar",
    "galasa.bootLauncherMainClass": "dev.galasa.boot.Launcher",
    "galasa.uberObr": "mvn:dev.galasa/dev.galasa.uber.obr/0.42.0/obr",
    "galasa.simbankJarPath": "/opt/galasa/0.42.0/galasa-simplatform-0.42.0.jar",
    "galasa.examplesArchivePath": "/opt/galasa/0.42.0/galasa-simbank-tests.zip",
    "galasa.examplePackagePrefix": "dev.galasa.simbank",
    "galasa.requestor": "TSOUSER@PLEX1",
    "galasa.cliTimeoutMs": 600000
}
```

A six-minute timeout is generous but realistic for IPL/operator-driven managers.

---

## 12. Non-Z host workflows

For Linux / macOS / Windows / browser / cloud targets, the same `galasactl` flow applies. Common manager families: `docker`, `kubernetes`, `selenium`, `http`, `jdbc`, `linux`, `windows`.

### 12.1 Local Docker target

```properties
docker.engines=LOCAL
docker.engine.LOCAL.hostname=localhost
docker.engine.LOCAL.port=2375
```

Activate this set as a named environment in the **Environment Properties** view, then debug your Docker-based test. The extension forwards the active environment's properties as overrides on every local launch.

### 12.2 Browser / Selenium

Selenium-driven tests typically need a separately running Grid plus credentials in the secrets store:

```properties
selenium.grid.endpoint=https://selenium-grid.example.com
selenium.driver=chrome
```

```bash
# Push the secret to the ecosystem
"Galasa: Secrets - Set"  → name: SELENIUM_GRID_TOKEN
```

### 12.3 HTTP / JDBC / generic distributed managers

Configure each manager via its own CPS keys (see manager docs in `galasa-dev/galasa/modules/managers`). The extension's role is identical — it merges your environment's override file and runs the test.

### 12.4 Recommended settings for non-Z host development

```jsonc
{
    "galasa.javaHome": "/opt/jdk-21",
    "galasa.cliPath": "/opt/galasa/bin/galasactl",
    "galasa.bootJarPath": "/opt/galasa/0.42.0/galasa-boot-0.42.0.jar",
    "galasa.bootLauncherMainClass": "dev.galasa.boot.Launcher",
    "galasa.uberObr": "mvn:dev.galasa/dev.galasa.uber.obr/0.42.0/obr",
    "galasa.maven-remote": "https://artifactory.example.com/maven-public",
    "galasa.requestor": "alice@example.com",
    "galasa.cliTimeoutMs": 120000
}
```

---

## 13. Hybrid workflows

Teams often split development between local debug (fast feedback) and ecosystem submission (real targets, stable infra). The recommended pattern:

| Phase | Where | What |
|-------|-------|------|
| **Author** | Local | Edit + compile in VS Code with the Java Extension Pack. |
| **Smoke** | Local debug + SimBank or Docker | One-click *Debug Galasa test locally*. |
| **Integration** | Ecosystem (`runs submitLocal`) | One-test-class submission to the shared cluster. |
| **Regression** | Ecosystem (`runs prepare`/`runs submit`) | YAML portfolio batched against a shared stream. |
| **Triage** | RAS + run tail | `galasa.runs.tail` for live raw output, `galasa.runs.download` for offline forensics. |

Switch between *local* and *ecosystem* cleanly by maintaining two **environment property** sets in the sidebar (e.g. `local-docker.properties` and `prod-zos.properties`) — only one is active at a time.

---

## 14. Command reference

All 57 commands. Invoke from the Command Palette (**Ctrl+Shift+P** / **Cmd+Shift+P**), CodeLens, or the sidebar context menus.

### 14.1 Test authoring & local debug

| Command ID | Title | Purpose |
|------------|-------|---------|
| `galasa-test.debug` | Debug Galasa test locally | Launch the active Java test or `.feature` in the local debugger. |
| `galasa-test.export` | Galasa Export launch.json | Append a `galasa` launch entry for the active file to `.vscode/launch.json`. |
| `galasa-test.simbank` | Launch Simbank | Run SimBank in a terminal using the configured jar. |
| `galasa-test.createExamples` | Create SimBank Examples | Extract the configured examples archive into the workspace, scaffolding per-package projects. |

### 14.2 Local Runs (RAS)

| Command ID | Title | Purpose |
|------------|-------|---------|
| `galasa-ras.refresh` | Refresh the local RAS | Re-scan `${galasa.home}/ras` for the *Local Runs* view. |
| `galasa-ras.runlog` | Run Log | Open `run.log` for a selected run. |
| `galasa-ras.delete` | Delete | Delete a run's RAS directory. |
| `galasa-ras.open` | Open a file from the RAS | Open a specific RAS file directly. |
| `galasa-ras.overview` | (internal) | Render a run's overview webview. |
| `galasa-artifacts.open` | Open | Open an artifact (special-cases `.gz` 3270 captures into the Terminal Screen viewer). |

### 14.3 Environment properties (sidebar)

| Command ID | Title | Purpose |
|------------|-------|---------|
| `galasa-envionment.refresh` | Refresh | Reload `${galasa.home}/vscode/*.properties`. |
| `galasa-envionment.addEnv` | Add Environment | Create a new named environment file. |
| `galasa-envionment.delEnv` | Delete | Remove the selected environment. |
| `galasa-envionment.active` | Set Active | Mark an environment as active for subsequent local runs. |

### 14.4 Authentication

| Command ID | Purpose |
|------------|---------|
| `galasa.auth.login` | Browser-based OAuth-style login (delegates to `galasactl auth login` in a terminal). |
| `galasa.auth.logout` | Server-side sign-out. |
| `galasa.auth.tokens.get` | List the tokens you currently hold. |
| `galasa.auth.tokens.delete` | Revoke a specific token by ID. |
| `galasa.auth.status` | Quick "am I authenticated?" check (exit 0 ⇒ yes). |

### 14.5 Runs

| Command ID | Purpose |
|------------|---------|
| `galasa.runs.prepare` | Build a portfolio YAML for a given stream/test class. |
| `galasa.runs.submit` | Submit a portfolio to the ecosystem. |
| `galasa.runs.submitLocal` | Submit a single local class+OBR for a one-shot run. |
| `galasa.runs.get` | Show details (`--format details`) for a named run. |
| `galasa.runs.tail` | Live-stream a run's raw output (`--format raw`) in a terminal. |
| `galasa.runs.delete` | Delete a single run. |
| `galasa.runs.deleteBulk` | Delete multiple runs (comma- or whitespace-separated). |
| `galasa.runs.download` | Download all artifacts of a named run. |
| `galasa.runs.reset` | Move a run back to a fresh state. |
| `galasa.runs.cancel` | Cancel an in-flight run. |
| `galasa.runs.update` | Patch the `--status` and/or `--result` fields. |
| `galasa.runs.cleanup` | Sweep finished runs in the ecosystem matching a filter (`--age`, `--requestor`, `--result`, `--status`). |
| `galasa.runs.cleanupLocal` | Same, but for local-history records. |

### 14.6 Project setup

| Command ID | Purpose |
|------------|---------|
| `galasa.local.init` | Initialise `~/.galasa` (bootstrap, overrides, credentials, cps). |
| `galasa.project.create` | Scaffold a new Maven/Gradle Galasa project skeleton. |

### 14.7 Properties / Resources / Secrets

| Command ID | Purpose |
|------------|---------|
| `galasa.properties.get` | Fetch a CPS property. |
| `galasa.properties.set` | Set a CPS property. |
| `galasa.properties.delete` | Delete a CPS property. |
| `galasa.properties.namespaces.get` | List CPS namespaces. |
| `galasa.resources.apply` | Apply a YAML resource file. |
| `galasa.resources.create` | Strict create (errors if exists). |
| `galasa.resources.update` | Strict update (errors if missing). |
| `galasa.resources.delete` | Delete a YAML resource file. |
| `galasa.secrets.get` | Fetch a secret (metadata; values may be elided). |
| `galasa.secrets.set` | Create or update a secret. |
| `galasa.secrets.delete` | Delete a secret. |

### 14.8 Streams / Tags / Monitors / Users / Roles

| Command ID | Purpose |
|------------|---------|
| `galasa.streams.get` | Show a stream definition (or list all). |
| `galasa.streams.set` | Upsert a stream (`--obr`, `--maven-repo`, `--description`, `--test-catalog`). |
| `galasa.streams.delete` | Delete a stream. |
| `galasa.tags.get` | List or fetch tags on a stream. |
| `galasa.tags.set` | Set a tag value on a stream. |
| `galasa.tags.delete` | Delete a tag from a stream. |
| `galasa.monitors.get` | Show monitor configuration. |
| `galasa.monitors.set` | Upsert monitor configuration. |
| `galasa.users.get` | List users (or one by login id). |
| `galasa.users.set` | Assign a role to a user. |
| `galasa.users.delete` | Delete a user. |
| `galasa.roles.get` | List defined roles. |

### 14.9 Health

| Command ID | Purpose |
|------------|---------|
| `galasa.diagnostics` | One-shot health report (Java + CLI + GALASA_HOME + bootstrap) to the *Galasa* output channel. |

---

## 15. Java compatibility

| Java major | Status | Auto-injected VM args |
|-----------:|--------|-----------------------|
| ≤ 7 | unsupported | warning shown, debug not launched |
| 8 | supported | (none — bare `-jar`/main-class invocation) |
| 9 – 16 | supported | full `--add-opens` block on `java.base` and `java.management/sun.management` |
| 17 – 20 | supported | the above **plus** `-Djava.security.manager=allow` |
| 21 – 26 | supported | the above **plus** `-Djdk.attach.allowAttachSelf=true` |
| ≥ 27 | unsupported | warning shown |

The extension exposes the parser, range gate, and per-tier VM-arg synthesizer; all three are unit-tested across every boundary (8, 9, 16, 17, 20, 21, 26).

---

## 16. VS Code backward compatibility

`engines.vscode: ^1.116.0` — works on the current release plus the two prior minor versions. The extension's API surface is intentionally limited to APIs stable since well before 1.116:

`workspace.getConfiguration / findFiles / openTextDocument / createFileSystemWatcher / onDidChangeConfiguration`, `window.showInputBox / showQuickPick / showInformationMessage / showErrorMessage / showWarningMessage / createOutputChannel / createTerminal / createStatusBarItem / registerTreeDataProvider / createWebviewPanel`, `commands.registerCommand / executeCommand`, `debug.registerDebugConfigurationProvider / startDebugging`, `languages.registerCodeLensProvider`, `extensions.getExtension`.

---

## 17. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Status bar reads "no Java" | None of `galasa.javaHome`, `java.home`, `JAVA_HOME`, `PATH` resolve to a runnable JDK. | Install a JDK 8–26 and set `galasa.javaHome` to its install dir. |
| Status bar reads "Java N unsupported" | JDK is < 8 or > 26. | Switch to a supported JDK. |
| `Galasa: 'galasa.bootJarPath' and 'galasa.bootLauncherMainClass' must be configured` | Local debug launch attempted without a boot jar. | Set both settings; see §5.4. |
| `galasactl is not available or returned an error` | CLI not on `PATH` or `galasa.cliPath` wrong. | Run *Galasa: Diagnostics*. |
| CLI calls hang | Network to bootstrap blocked or remote slow. | Increase `galasa.cliTimeoutMs`; verify with *Diagnostics*. |
| Ecosystem command fails with `auth required` | Token expired or never issued. | Run **Galasa: Auth - Login**, verify with **Galasa: Auth - Status**. |
| 3270 `.gz` artifact opens as binary text | The Artifacts view's `galasa-artifacts.open` hook is bypassed (e.g. opened from Explorer). | Open via the *Artifacts* view instead. |
| `IllegalAccessException` on Java 9+ | `--add-opens` flags missing because `detectJava()` returned an old JDK. | Re-run *Diagnostics*; set `galasa.javaHome` explicitly. |
| Workspace OBR build (Maven) fails | Maven cannot reach `galasa.maven-remote`. | Configure `~/.m2/settings.xml` proxy or set `galasa.maven-local`. |
| Local run produces no RAS entries | `galasa.home` mis-set or read-only. | Verify in *Diagnostics*; ensure write permission. |
| Debug session doesn't stop on breakpoints | Source paths not on the project's classpath. | Ensure each test bundle's `pom.xml` is recognised by the Java Extension Pack. |

---

## 18. Security considerations

- **Tokens** issued by `galasa.auth.login` are stored by `galasactl` under `~/.galasa/galasactl.properties`. Treat that file like an SSH private key — file mode `600`.
- **`credentials.properties`** in `~/.galasa` holds plain-text test credentials. Restrict its file mode and never commit it.
- **`galasa.bootstrap`** may include a `https://` URL; the extension does not pin TLS — rely on the OS trust store.
- **CLI invocations** are spawned with `shell: false`, so user-supplied input box values are passed as separate `argv` elements (no shell injection). Argv builders are unit-tested.
- **`galasa.requestor`** appears verbatim in run records on the ecosystem; do not put secrets there.
- The extension never sends telemetry beyond what VS Code itself emits.

---

## 19. Environment variables

| Variable | Read by | Effect |
|----------|---------|--------|
| `JAVA_HOME` | extension + spawned `java` | Fallback for Java detection. |
| `GALASA_HOME` | extension + `galasactl` | Fallback for `galasa.home`. The extension also exports it on every CLI spawn. |
| `GALASA_BOOTSTRAP` | `galasactl` | Exported on every CLI spawn from `galasa.bootstrap`. |
| `USERPROFILE` / `HOME` | extension | Used to locate the default `~/.galasa`. |

---

## 20. Running tests (contributors)

```bash
nvm use 24                # or any Node ≥ 24
npm install
npm run test:typecheck    # tsc -p tsconfig.test.json --noEmit
npm test                  # mocha — 164 unit tests, runs in ~80 ms
npx tsc -p ./             # production build
```

CI matrix in [.github/workflows/ci.yml](../.github/workflows/ci.yml):
- **lint** → **typecheck** → (parallel: **unit-tests** [ubuntu/macos/windows], **java-matrix** [JDK 8/11/17/21]) → **package** (VSIX).
- The `release.yml` pipeline runs the same typecheck + tests gate before publishing.
