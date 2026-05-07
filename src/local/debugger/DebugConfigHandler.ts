import { DebugConfiguration, workspace, ExtensionContext, tasks, Task, TaskScope, ShellExecution, Uri, window } from 'vscode';
import * as fs from 'fs';
import { EnvironmentProvider } from '../views/TreeViewEnvironmentProperties';
import { detectJava, getRequiredVmArgs, isVersionSupported, MAX_SUPPORTED_JAVA, MIN_SUPPORTED_JAVA } from '../../utils/JavaVersion';
var path = require('path');
var os = require('os');

export async function getDebugConfig(testClass : TestCase | string | GherkinTestCase, galasaPath : string, context : ExtensionContext, environmentProvider : EnvironmentProvider, args? : string, env? : string) : Promise<DebugConfiguration> {
    let maven = "";
    let filePrefix = "file://";
    if (os.platform() == "win32") {
        filePrefix = "file:///"
    }

    let localMaven : string | undefined = workspace.getConfiguration("galasa").get("maven-local");
    if(localMaven && localMaven.trim().length != 0) {
        maven = maven + "--localmaven " + filePrefix + workspace.getConfiguration("galasa").get("maven-local") + " ";
        maven = maven.replace(/\\/g,"/");
    }
    let remoteMaven : string | undefined = workspace.getConfiguration("galasa").get("maven-remote");
    if(remoteMaven && remoteMaven.trim().length != 0) {
        maven = maven + "--remotemaven " + workspace.getConfiguration("galasa").get("maven-remote") + " ";
    }
    
    let bootstrap : string | undefined = workspace.getConfiguration("galasa").get("bootstrap");
    if(!bootstrap) {
        bootstrap = filePrefix + path.join(galasaPath, "bootstrap.properties");
    }
    const bootstrapURI = "--bootstrap " + bootstrap.replace(/\\/g,"/")  + " ";

    const overridesURI = buildOverrides(galasaPath, context, environmentProvider, bootstrap, filePrefix, env).replace(/\\/g,"/");

    let workspaceObr = await buildLocalObr(context);
    workspaceObr = workspaceObr.replace(/\\/g,"/");
    
    let testType = "--test ";
    if (testClass instanceof TestCase) {
        testClass = findTestArtifact(testClass);
    } else if (testClass instanceof GherkinTestCase) {
        testClass = testClass.uri.toString().replace("%40", "@");
        testType = "--gherkin ";
    }

    let extraArgs = "";
    if(args) {
        extraArgs = args + " ";
    }

    const vmArgs = buildVmArgs();

    const bootJarPath : string | undefined = workspace.getConfiguration("galasa").get("bootJarPath");
    const mainClass : string | undefined = workspace.getConfiguration("galasa").get("bootLauncherMainClass");
    const uberObr : string | undefined = workspace.getConfiguration("galasa").get("uberObr");

    if (!bootJarPath || !mainClass) {
        window.showErrorMessage(
            "Galasa: 'galasa.bootJarPath' and 'galasa.bootLauncherMainClass' must be configured before launching a debug session."
        );
    }

    let obrArg = "";
    if (uberObr && uberObr.trim().length > 0) {
        obrArg = "--obr " + uberObr.trim() + " ";
    }

    const debugConfig : DebugConfiguration = {
        name: "Galasa Debug",
        type: "java",
        request: "launch",
        classPaths: bootJarPath ? [bootJarPath.replace(/\\/g, "/")] : [],
        mainClass: mainClass ?? "",
        args: workspaceObr + extraArgs + maven + obrArg
            + bootstrapURI + overridesURI + testType + testClass
    };

    if (vmArgs) {
        debugConfig.vmArgs = vmArgs;
    }

    const installation = detectJava();
    if (installation && installation.source === 'configured') {
        debugConfig.javaExec = installation.javaPath;
    }

    return debugConfig;
}

function buildVmArgs() : string {
    const installation = detectJava();
    if (!installation) {
        window.showWarningMessage(
            `No Java runtime detected. The Galasa debugger requires JDK ${MIN_SUPPORTED_JAVA}-${MAX_SUPPORTED_JAVA}.`
        );
        return "";
    }
    if (!isVersionSupported(installation.majorVersion)) {
        window.showWarningMessage(
            `Detected Java ${installation.majorVersion} is outside the supported range ` +
            `(${MIN_SUPPORTED_JAVA}-${MAX_SUPPORTED_JAVA}). The debugger may not start correctly.`
        );
    }
    return getRequiredVmArgs(installation.majorVersion).join(' ');
}

export function getGalasaVersion(context : ExtensionContext) : string  {
    let version : string | undefined = workspace.getConfiguration("galasa").get("version");
    if(!version || version == "LATEST") {
        version = JSON.parse(fs.readFileSync(path.join(context.extensionPath, "package.json")).toString()).symbolicversion + "";
    }
    
    return version;
}

function buildOverrides(galasaPath : string, context : ExtensionContext, environmentProvider : EnvironmentProvider, bootstrap : string, filePrefix : string, env? : string) : string {
    if(!fs.existsSync(path.join(context.extensionPath, "galasa-workspace"))) {
        fs.mkdirSync(path.join(context.extensionPath, "galasa-workspace"));
    }
    if(!fs.existsSync(path.join(context.extensionPath, "galasa-workspace", "overrides"))) {
        fs.mkdirSync(path.join(context.extensionPath, "galasa-workspace", "overrides"));
    }
    const filepath = path.join(context.extensionPath, "galasa-workspace", "overrides", "generated_overrides.properties");

    if(workspace.getConfiguration("galasa").get("overrides")) {
        fs.writeFileSync(filepath, fs.readFileSync(path.join(galasaPath, "overrides.properties")));
    } else {
        fs.writeFileSync(filepath, "");
    }

    let envPath;
    if(!env) {
        envPath = environmentProvider.getEnvironment();
    } else {
        envPath = findEnvironment(env, galasaPath);
    }
     
    if(envPath) {
        const environmentPropContent = fs.readFileSync(envPath).toString();
        environmentPropContent.split(/\r?\n/).forEach(line => {
            const keyPair = line.split("=");
            if(keyPair.length == 2) {
                overrideProperty(filepath, keyPair[0], keyPair[1]);
            }
        });
    }

    let resultsPath = filePrefix + path.join(galasaPath, "ras").replace(/\\/g,"/");
    let credsPath = filePrefix + path.join(galasaPath, "credentials.properties").replace(/\\/g,"/");
    let bootstrapPath = bootstrap.replace(/\\/g,"/");

    
    overrideProperty(filepath, "framework.resultarchive.store", resultsPath);
    overrideProperty(filepath, "framework.credentials.store",credsPath );
    overrideProperty(filepath, "framework.bootstrap.url", bootstrapPath);

    let requestor : string | undefined = workspace.getConfiguration("galasa").get("requestor");
    if(!requestor) {
        requestor = "unknown";
    }
    overrideProperty(filepath, "framework.run.requestor", requestor);

    return "--overrides " + filePrefix + filepath + " ";
}

export async function buildLocalObr(context : ExtensionContext) : Promise<string> {
    let pomData = fs.readFileSync(path.join(context.extensionPath, "lib", "obr-pom.xml")).toString();
    let dependencies = "";

    const manifests = await workspace.findFiles("**/MANIFEST.MF");
    if(manifests.length == 0) {
        return "";
    }
    manifests.forEach(file => {
        const bundleName = findPomField(file.fsPath, "artifactId");
        const groupName = findPomField(file.fsPath, "groupId");
        const version = findPomField(file.fsPath, "version");
        dependencies = dependencies + "<dependency><groupId>" + groupName + "</groupId>" +
            "<artifactId>"+ bundleName +"</artifactId>" +
            "<version>"+ version + "</version>" +
            "<scope>compile</scope></dependency>\n"
    });
    let galasaVersion = getGalasaVersion(context);
    pomData = pomData.replace(/%%dependencies%%/g, dependencies).replace(/%%version%%/g, galasaVersion);

    if(!fs.existsSync(path.join(context.extensionPath, "galasa-workspace"))) {
        fs.mkdirSync(path.join(context.extensionPath, "galasa-workspace"));
    }
    if(!fs.existsSync(path.join(context.extensionPath, "galasa-workspace", "obr"))) {
        fs.mkdirSync(path.join(context.extensionPath, "galasa-workspace", "obr"));
    }
    fs.writeFileSync(path.join(context.extensionPath, "galasa-workspace", "obr", "pom.xml"), pomData);

    await tasks.executeTask(getBuildWorkspaceObrTask(context));

    return "--obr file:" + path.join(context.extensionPath, "galasa-workspace", "obr", "target", "repository.obr") + " ";
}

export function findTestArtifact(testClass : TestCase) : string {
    const data : string = fs.readFileSync(testClass.pathToFile).toString();
    let packageName = data.substring(data.indexOf("package") + 8);
    packageName = packageName.substring(0, packageName.indexOf(";")).trim();

    const bundleName = findPomField(path.dirname(testClass.pathToFile), "artifactId");

    return bundleName + "/" + packageName + "." + testClass.label;

}

function findPomField(directory : string, field : string) : string {
    if(fs.statSync(directory).isDirectory()) {
        let pom = "";
        fs.readdirSync(directory).forEach(file => {
            if(file.includes("pom.xml")) {
                pom = file;
            }
        });
        if(pom != "") {
            let data = fs.readFileSync(path.join(directory, pom)).toString();
            if(field == "artifactId" && data.includes("<parent>")) {
                data = data.substring(data.indexOf("</parent>"));
            }
            if(field == "version" && data.includes("<parent>")) {
                data = data.substring(0, data.indexOf("</parent>"));
            }
            data = data.substring(data.indexOf("<" + field + ">") + field.length + 2, data.indexOf("</"+ field +">"));
            return data;
        }
    }
    return findPomField(path.dirname(directory), field);
}

function getBuildWorkspaceObrTask(context : ExtensionContext) : Task {
    let config = workspace.getConfiguration();
    let settings : string | undefined = undefined;
    if(config.has("java.configuration.maven.userSettings")) {
        settings = config.get("java.configuration.maven.userSettings");
    }
    
    if(!settings || settings == "") {
        settings = "";
    } else {
        settings = " --settings " + settings;
    }

    let obrPath = path.join(context.extensionPath, "galasa-workspace", "obr").replace(/\\/g,"/");
    return new Task({type : "shell"}, TaskScope.Workspace.toString(), "Workspace Obr", new ShellExecution("mvn install -f " + obrPath + settings));
}

function findEnvironment(env : string, galasaPath : string) : string | undefined {
    let found;
    fs.readdirSync(path.join(galasaPath, "vscode")).forEach(file => {
        if(file.endsWith(".properties")) {
            const envPath = path.join(galasaPath, "vscode", file);
            const envName = fs.readFileSync(envPath).toString().split(/\r?\n/)[0].substring(1).trim();
            if(envName == env) {
                found = envPath;
            }
        }
    });
    return found;
}

function overrideProperty(filePath : string, key : string, value : string) {
    const fileContent = fs.readFileSync(filePath).toString();
    if(fileContent.includes(key)) {
        fileContent.split(/\r?\n/).forEach(line => {
            if(line.trim().startsWith(key)) {
                fs.writeFileSync(filePath, fileContent.replace(line, key + "=" + value) + "\n");
            }
        });
    } else {
        fs.appendFileSync(filePath, key + "=" + value + "\n");
    }
    
}

export class TestCase{

    constructor(
        public readonly label: string,
        public readonly pathToFile: string
    ) {}
  
}

export class GherkinTestCase{

    constructor(
        public readonly label: string,
        public readonly uri: Uri
    ) {}
  
}