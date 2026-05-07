import * as vscode from 'vscode';
import { registerAuthCommands } from './AuthCommands';
import { registerRunsCommands } from './RunsCommands';
import { registerRunsExtraCommands } from './RunsExtraCommands';
import { registerPropertiesCommands } from './PropertiesCommands';
import { registerProjectCommands } from './ProjectCommands';
import { registerSecretsCommands } from './SecretsCommands';
import { registerResourcesCommands } from './ResourcesCommands';
import { registerMonitorsCommands } from './MonitorsCommands';
import { registerRolesCommands } from './RolesCommands';
import { registerUsersCommands } from './UsersCommands';
import { registerStreamsCommands } from './StreamsCommands';
import { registerTagsCommands } from './TagsCommands';

export function registerAllGalasaCliCommands(context: vscode.ExtensionContext): void {
    registerAuthCommands(context);
    registerRunsCommands(context);
    registerRunsExtraCommands(context);
    registerPropertiesCommands(context);
    registerProjectCommands(context);
    registerSecretsCommands(context);
    registerResourcesCommands(context);
    registerMonitorsCommands(context);
    registerRolesCommands(context);
    registerUsersCommands(context);
    registerStreamsCommands(context);
    registerTagsCommands(context);
}
