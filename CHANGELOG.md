# Changelog for Galasa Extension

## Unreleased

Functionality
- Decoupled from upstream fork: removed the `repository`/`homepage` metadata, the legacy `Jenkinsfile`(s), `Dockerfile`, `httpd.conf`, the `sonarqube-scanner` dev dependency and the `sonar-scanner` script.
- Removed the bundled Galasa boot/Simbank/examples binaries and the `obr-pom.xml`. The previously hard-coded `dev.galasa.boot.Launcher` main class, `mvn:dev.galasa/dev.galasa.uber.obr` coordinate and `dev.galasa.simbank` example prefix are now driven by new settings: `galasa.bootJarPath`, `galasa.bootLauncherMainClass`, `galasa.uberObr`, `galasa.simbankJarPath`, `galasa.examplesArchivePath`, `galasa.examplePackagePrefix`, `galasa.exampleSubdirectories`, `galasa.examplePomPlaceholder`.
- Test annotation detection (`@Test` / `import dev.galasa.Test;`) is now configurable via `galasa.testAnnotation` and `galasa.testAnnotationImport`.
- Added GitHub Actions workflows: CI (lint + typecheck + Java 8/11/17/21 matrix + VSIX artifact), CodeQL security scanning, and a release pipeline (tag-driven or `workflow_dispatch`) that publishes a GitHub Release with the `.vsix` and optionally pushes to the VS Code Marketplace and Open VSX.
- Added Dependabot config (npm + GitHub Actions), PR template, and issue templates.

## Version 0.15.0

Functionality
- **Java 8 through Java 26 compatibility**: dynamic detection of the active JDK from `galasa.javaHome`, `java.home`, `JAVA_HOME`, and `PATH`, with automatic injection of `--add-opens`, `-Djava.security.manager=allow`, and self-attach VM args for Java 9 / 17 / 21+.
- **Galasa CLI integration**: every major `galasactl` command surface is exposed as a VS Code command:
  - `auth` - login, logout, list/revoke tokens
  - `runs` - prepare, submit (ecosystem and local), get, delete, download, reset, cancel
  - `local` - init
  - `project` - create (Maven/Gradle, with feature scaffolding)
  - `properties` - get, set, delete, list namespaces
  - `resources` - apply, create, update, delete
  - `monitors` - get, set
  - `secrets` - get, set, delete
  - `roles` - get
  - `users` - get, set role
  - `streams` - get, delete
- New configuration settings: `galasa.javaHome`, `galasa.cliPath`, `galasa.home`, `galasa.bootstrap`.
- Galasa output channel for capturing CLI command results.
- Unsupported JDK warnings on activation, with deep-link to the relevant settings.

Bugfixes
- Local runs no longer fail with `IllegalAccessException` on JDK 9+ thanks to the new VM args.
- SimBank launches now use the resolved JDK rather than relying on `java` being on the user's `PATH`.

## Version 0.10.0

Functionality
- Gherkin Functionality, support for running tests
- Webview for viewing Gherking test metadata

## Version 0.9.0

Bugfixes
- Terminal views
- Workspace OBR's are now properly built in order
- Debug Galasa appearing in random non-test files
- User preference Maven settings accounted for in Debug Galasa test

Functionality
- Launch.json export functionality to customise your debug environment with args and environment properties
- Reworked Galasa overrides where `.galasa/overrides.properties` is used by default and then overwritten by `.galenv properties`, which are actively pulled from the active environment

## 02/06/2020 - Version 0.8.2

Bugfixes
- Proper versioning of Galasa
- Opening Artifacts can only open files itself
- Displaying test structure of Local runs fixed

Functionality
- /

## 01/06/2020 - Version 0.8.1

Bugfixes 
- /

Functionality
- Running local Galasa test
- Status overview of past Galasa tests
- Retrieving and displaying all artifacts over past Galasa tests
- Launching Simbank example aplication to begin with Galasa
- Create a properties environment to switch between for different types of tests

*Initial Preview release*