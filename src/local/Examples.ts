import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from "unzipper";
import { rimrafSync } from "rimraf";
import { detectJava, getRequiredVmArgs, isVersionSupported, MAX_SUPPORTED_JAVA, MIN_SUPPORTED_JAVA } from "../utils/JavaVersion";

interface ExampleConfig {
    examplesArchivePath: string;
    examplePackagePrefix: string;
    targetSubdirectories: string[];
    pomPlaceholder: string;
}

interface SimbankConfig {
    jarPath: string;
}

function getSimbankConfig(): SimbankConfig | undefined {
    const configured = vscode.workspace.getConfiguration("galasa").get<string>("simbankJarPath");
    if (!configured || configured.trim().length === 0) {
        return undefined;
    }
    return { jarPath: configured.trim() };
}

function getExampleConfig(): ExampleConfig | undefined {
    const archive = vscode.workspace.getConfiguration("galasa").get<string>("examplesArchivePath");
    const prefix = vscode.workspace.getConfiguration("galasa").get<string>("examplePackagePrefix");
    const subdirs = vscode.workspace.getConfiguration("galasa").get<string[]>("exampleSubdirectories");
    const placeholder = vscode.workspace.getConfiguration("galasa").get<string>("examplePomPlaceholder") ?? "%%prefix%%";
    if (!archive || archive.trim().length === 0 || !prefix || prefix.trim().length === 0) {
        return undefined;
    }
    return {
        examplesArchivePath: archive.trim(),
        examplePackagePrefix: prefix.trim(),
        targetSubdirectories: subdirs && subdirs.length > 0 ? subdirs : ["manager", "tests"],
        pomPlaceholder: placeholder
    };
}

export function launchSimbank(context : vscode.ExtensionContext) {
    const simbank = getSimbankConfig();
    if (!simbank) {
        vscode.window.showErrorMessage(
            "Cannot launch Simbank: 'galasa.simbankJarPath' is not configured. " +
            "Set it to the path of your Simbank distribution jar."
        );
        return;
    }
    if (!fs.existsSync(simbank.jarPath)) {
        vscode.window.showErrorMessage(
            `Cannot launch Simbank: '${simbank.jarPath}' does not exist.`
        );
        return;
    }

    const installation = detectJava();
    if (!installation) {
        vscode.window.showErrorMessage(
            `Cannot launch Simbank: no Java runtime detected. Install JDK ${MIN_SUPPORTED_JAVA}-${MAX_SUPPORTED_JAVA} ` +
            `and configure 'galasa.javaHome' or set JAVA_HOME.`
        );
        return;
    }
    if (!isVersionSupported(installation.majorVersion)) {
        vscode.window.showErrorMessage(
            `Detected Java ${installation.majorVersion} is outside the supported range ` +
            `(${MIN_SUPPORTED_JAVA}-${MAX_SUPPORTED_JAVA}). Please install a supported JDK.`
        );
        return;
    }

    const javaCommand = quoteIfNeeded(installation.javaPath);
    const vmArgs = getRequiredVmArgs(installation.majorVersion).join(' ');
    const jarPath = quoteIfNeeded(simbank.jarPath);

    let terminal = vscode.window.createTerminal("SimBank");
    terminal.show();
    const command = `${javaCommand} ${vmArgs} -jar ${jarPath}`.replace(/\s+/g, ' ').trim();
    terminal.sendText(command);
}

function quoteIfNeeded(value: string): string {
    if (value.includes(' ')) {
        return `"${value}"`;
    }
    return value;
}

export async function createExampleFiles(context : vscode.ExtensionContext) {
    const config = getExampleConfig();
    if (!config) {
        vscode.window.showErrorMessage(
            "Cannot create examples: 'galasa.examplesArchivePath' and 'galasa.examplePackagePrefix' must be configured."
        );
        return;
    }
    let packageName = await vscode.window.showInputBox({ placeHolder: "Package Name" });
    if(packageName != undefined) {
        if(packageName == "") {
            packageName = config.examplePackagePrefix;
        }

        if(await exampleExists(packageName, config)) {
            vscode.window.showInformationMessage("Example code with package name '" + packageName +"' already exists");
        } else {
            await generateExampleCode(packageName, context, config);
        }
    }
}

async function exampleExists(packageName : string, config : ExampleConfig) : Promise<boolean> {
    let foundFiles = await vscode.workspace.findFiles("**/" + packageName + "." + config.targetSubdirectories[0] + "/**");
    if (config.targetSubdirectories.length > 1) {
        foundFiles = foundFiles.concat(await vscode.workspace.findFiles("**/" + packageName + "." + config.targetSubdirectories[1] + "/**"));
    }
    return foundFiles.length > 0;
}

async function generateExampleCode(packageName : string, context : vscode.ExtensionContext, config : ExampleConfig) {
    let javaExt = vscode.extensions.getExtension("redhat.java");
    let enabledBuilding : boolean | undefined = false;
    if(javaExt) {
        let cfg = vscode.workspace.getConfiguration();
        if(cfg.has("java.autobuild.enabled")) {
            enabledBuilding = cfg.get("java.autobuild.enabled");
            cfg.update("java.autobuild.enabled", false);
        }
    }
    if(vscode.workspace.workspaceFolders) {
        let workpath = getWorkspacePath();
        if(workpath) {
            if (!fs.existsSync(config.examplesArchivePath)) {
                vscode.window.showErrorMessage(`Examples archive not found: ${config.examplesArchivePath}`);
                return;
            }
            const fileContents = fs.createReadStream(config.examplesArchivePath);
            fileContents.pipe(unzipper.Extract({ path: workpath }));

            let watcher = vscode.workspace.createFileSystemWatcher(`**/${config.examplePackagePrefix}.*`);
            watcher.onDidCreate(async project => {
                let watcherWorkpath = getWorkspacePath();
                try {
                    await Promise.resolve(() => setTimeout(() => {}, 100));
                    let exampleName = "";
                    if(project.toString().lastIndexOf("/") != -1) {
                        exampleName = project.toString().substring(project.toString().lastIndexOf("/") + 1);
                    } else {
                        exampleName = project.toString().substring(project.toString().lastIndexOf("\\") + 1);
                    }
                    const projectName = exampleName.toString().replace(config.examplePackagePrefix, packageName);
                    const validSubdir = config.targetSubdirectories.some(s => exampleName === `${config.examplePackagePrefix}.${s}`);
                    if(watcherWorkpath && !fs.existsSync(path.join(watcherWorkpath, projectName)) && validSubdir) {
                        copyDirectory(path.join(watcherWorkpath, "examples", exampleName), path.join(watcherWorkpath, projectName));

                        const pomExamplePath = path.join(watcherWorkpath, projectName, "pom-example.xml");
                        if (fs.existsSync(pomExamplePath)) {
                            let pomData = fs.readFileSync(pomExamplePath).toString();
                            pomData = pomData.split(config.pomPlaceholder).join(packageName);
                            fs.writeFileSync(pomExamplePath, pomData);
                            fs.renameSync(pomExamplePath, path.join(watcherWorkpath, projectName, "pom.xml"));
                        }

                        const allCreated = config.targetSubdirectories.every(s =>
                            fs.existsSync(path.join(watcherWorkpath as string, packageName + "." + s))
                        );
                        if(allCreated) {
                            try { rimrafSync(path.join(watcherWorkpath, "examples")); } catch { /* ignore */ }
                            watcher.dispose();
                        }
                    }
                } catch(err) {
                    vscode.window.showErrorMessage("Error loading example tests, please verify the configured archive and try again.");
                    if(watcherWorkpath) {
                        config.targetSubdirectories.forEach(s => {
                            try { rimrafSync(path.join(watcherWorkpath as string, packageName + "." + s)); } catch { /* ignore */ }
                        });
                        try { rimrafSync(path.join(watcherWorkpath, "examples")); } catch { /* ignore */ }
                    }
                } finally {
                    if(javaExt) {
                        let cfg = vscode.workspace.getConfiguration();
                        if(cfg.has("java.autobuild.enabled")) {
                            cfg.update("java.autobuild.enabled", enabledBuilding);
                        }
                    }
                }
            });
        }
    }
}

export function getWorkspacePath() : string | undefined {
    let workspacePath : string | undefined = undefined;
    if(vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
            if(!workspacePath) {
                workspacePath = folder.uri.toString().replace("%40","@").replace("file://", "");
            }
        }
    }
    return workspacePath;
}

function copyDirectory(source : string, target : string) {
    fs.mkdirSync(target);
    fs.readdirSync(source).forEach(file => {
        if(fs.statSync(path.join(source, file)).isFile()) {
            fs.copyFileSync(path.join(source, file), path.join(target, file));
        } else {
            copyDirectory(path.join(source, file), path.join(target, file));
        }
    });
}
