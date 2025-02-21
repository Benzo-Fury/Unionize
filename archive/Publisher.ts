import {
  CommandInitPlugin,
  type CommandModule,
  CommandType,
  controller,
  EventType,
  type Init,
  type Logging,
  type Module,
  type SernOptionsData,
} from "@sern/handler";
import {
  ApplicationCommandType,
  ComponentType,
  InteractionType,
  PermissionFlagsBits,
  REST,
  Routes,
} from "discord.js";
import assert from "node:assert";
import { readdir } from "node:fs/promises";
import { join, parse, resolve } from "node:path";
import { inspect } from "node:util";

// ------------------ Functions ------------------ //

/**
 * Takes the bot token and resolves it into the id.
 */
async function resolveId(t: string): Promise<string> {
  try {
    const rest = new REST().setToken(t);

    const bot = (await rest.get(Routes.currentApplication())) as any;

    return bot.id;
  } catch (e) {
    throw new Error("Error whilst fetching your application: " + e);
  }
}

function intoApplicationType(type: number) {
  return type === 3 ? 1 : Math.log2(type);
}

/**
 * Validates a command description.
 */
function makeDescription(type: number, desc: string) {
  if (
    (type == CommandType.Slash || type == CommandType.Both) &&
    (!desc || desc.length === 0)
  ) {
    throw new Error(
      "Found application command that has no description field or is empty.",
    );
  }
  if (
    (type == CommandType.CtxMsg || type == CommandType.CtxUser) &&
    desc.length > 0
  ) {
    console.warn(
      "Found context menu that has non empty description field. Implicitly publishing with empty description.",
    );
    return "";
  }
  return desc;
}

function optionsTransformer(ops?: SernOptionsData[]) {
  return (
    ops?.map((el) => {
      if ("command" in el) {
        const { command, ...rest } = el;
        return rest;
      }
      return el;
    }) ?? []
  );
}

function serializePerms(perms: unknown) {
  if (typeof perms === "bigint" || typeof perms === "number") {
    return perms.toString();
  }

  if (Array.isArray(perms)) {
    return perms.reduce((acc, cur) => acc | cur, BigInt(0)).toString();
  }
  return null;
}

// --------------------- Vars -------------------- //

const PUBLISHABLE = 0b1110;
const defaultConfig: PublisherConfig = {
  extensionTypeChecking: true,
  logLevel: "normal",
  publishOnInit: true,
};

// -------------------- Typing ------------------- //

export interface PublisherConfig {
  /**
   * Controls weather the algorithm should filter files to ones that end with ".js".
   * Disable this if you are using a transpiler.
   */
  extensionTypeChecking?: boolean;
  /**
   * Tells the publisher what level of logging it should use.
   *
   * - `normal`: *Full logging when all global commands are published and when each guilds commands are published*
   * - `reduced`: *Only logs when the publisher successfully finishes publishing*
   * - `none`: *You will get no logs*
   */
  logLevel?: "normal" | "reduced" | "none";
  /**
   * Controls weather the init method will publish modules or just load them.
   * They can be published later with the .publish() method.
   */
  publishOnInit?: boolean;
}

export interface Command {
  guildIds: string[];
  toJSON(): {
    name: string | undefined;
    type: number;
    description: any;
    options: any;
    default_member_permissions: string;
    integration_types: string[];
    contexts: number[];
    name_localizations: unknown;
    description_localizations: unknown;
  };
}

export interface LocalPublish {
  guildIds?: string[];
  default_member_permissions: string;
  integration_types: string[];
  contexts: number[];
}

export interface CommandStorage {
  global: Command[];
  guilded: Command[];
}

/**
 * A processed module.
 * Taken from: https://github.com/sern-handler/handler/blob/main/src/types/core-modules.ts#L115
 */
export type Processed<T> = T & { name: string; description: string };

// ------------------- Classes ------------------- //

interface ModuleManagerConfig {
  /**
   * Controls wether the ModuleManager
   */
  extensionTypeChecking: boolean;
}

/**
 * Internally handles the modules for the publisher.
 */
class ModuleManager {
  public modules?: Processed<Module>[];
  private modulePaths: string[];
  private config?: ModuleManagerConfig;

  constructor(modulePaths: string[], config: ModuleManagerConfig) {
    this.modulePaths = modulePaths;
    this.config = config;
  }

  public async load() {
    /**
     * A global list of all modules from all directories.
     */
    let gModules: Processed<Module>[] = [];

    // Resolving all modulePaths into an array of modules
    for (const dir of this.modulePaths) {
      const absoluteDir = resolve(process.cwd(), dir);

      /**
       * A local list of modules from THIS directory.
       */
      const localModules = await this.getModulesFromDir(absoluteDir);

      gModules.push(...localModules);
    }

    // Filter only publishable modules (no text commands)
    gModules = gModules.filter((module) => (module.type & PUBLISHABLE) != 0);

    return gModules;
  }

  /**
   * Takes a directory string and gets all modules recursively.
   */
  private async getModulesFromDir(dir: string): Promise<Processed<Module>[]> {
    const modules: Processed<Module>[] = [];

    const files = await readdir(dir, { withFileTypes: true });

    for (const file of files) {
      // Ignore "!" files
      if (file.name.startsWith("!")) continue;

      // Check extension if configured todo so
      if (this.config?.extensionTypeChecking && !file.name.endsWith(".js"))
        continue;

      /**
       * File path that should be relative to the application root (src).
       */
      const filePath = join(file.parentPath, file.name);

      if (file.isDirectory()) {
        const subModules = await this.getModulesFromDir(filePath);
        modules.push(...subModules);
      } else if (file.isFile()) {
        // Dynamically import the file
        const file = await import(`file://${filePath}`);
        const module = file.default as Module;

        // Validate the modules
        this.validateModule(module, filePath);

        // Push module to array
        modules.push(module as Processed<Module>);
      }
    }

    return modules;
  }

  /**
   * Validates a module.
   * Pretty much a modified version of: https://github.com/sern-handler/handler/blob/main/src/core/module-loading.ts#L37
   * @param modulePath Should be the absolute path to the module.
   */
  private validateModule(module: Module, modulePath: string) {
    assert(module, `No default export at: ${module}`);

    if ("default" in module) {
      module = module.default as Module;
    }

    const p = parse(modulePath);

    module.name ??= p.name;
    module.description ??= "...";
    module.meta = {
      id: this.createModuleId(module.name, module.type),
      absPath: modulePath,
    };
  }

  /*
   * Generates an id based on name and CommandType.
   * A is for any ApplicationCommand. C is for any ComponentCommand
   * Then, another number fetched from TypeMap.
   *
   * Taken from: https://github.com/sern-handler/handler/blob/main/src/core/id.ts#L59
   */
  private createModuleId(name: string, type: CommandType | EventType) {
    const TypeMap = new Map<number, number>([
      [CommandType.Text, 0],
      [CommandType.Both, 0],
      [CommandType.Slash, ApplicationCommandType.ChatInput],
      [CommandType.CtxUser, ApplicationCommandType.User],
      [CommandType.CtxMsg, ApplicationCommandType.Message],
      [CommandType.Button, ComponentType.Button],
      [CommandType.StringSelect, ComponentType.StringSelect],
      [CommandType.Modal, InteractionType.ModalSubmit],
      [CommandType.UserSelect, ComponentType.UserSelect],
      [CommandType.MentionableSelect, ComponentType.MentionableSelect],
      [CommandType.RoleSelect, ComponentType.RoleSelect],
      [CommandType.ChannelSelect, ComponentType.ChannelSelect],
    ]);

    if (type == CommandType.Text) {
      return `${name}_T`;
    }
    if (type == CommandType.Both) {
      return `${name}_B`;
    }
    if (type == CommandType.Modal) {
      return `${name}_M`;
    }
    const am = (PUBLISHABLE & type) !== 0 ? "A" : "C";
    return `${name}_${am}${TypeMap.get(type)!}`;
  }
}

/**
 * A refined version of `@sern/publisher`.
 *
 * - Doesn't get modules from sern and therefor can be used outside of your main application program.
 * - Can be used with the already existing publish plugin and therefor requires no modification to commands.
 * - Tested an ran on Bun v1.2.1. Please notify me via Discord if the program does not run as expected on node.
 * - Doesn't create the redundant .sern folder and files.
 */
export class Publisher implements Init {
  private bot: {
    token: string;
    id?: string; // Optional as it may not be defined in the constructor
  };
  private moduleManager: ModuleManager;
  private config: PublisherConfig;
  private logger: Logging;

  public commands: {
    global: Command[];
    guilded: Command[];
  } = { global: [], guilded: [] };

  get modules() {
    return this.moduleManager.modules;
  }

  constructor(
    token: string,
    commandDirectorys: string[],
    logger: Logging,
    config: PublisherConfig = {},
  ) {
    this.bot = {
      token,
      // Could implement a a way to pass the bot id here in future
    };
    this.moduleManager = new ModuleManager(commandDirectorys, {
      extensionTypeChecking:
        config?.extensionTypeChecking ?? defaultConfig.extensionTypeChecking!,
    });
    this.logger = logger;
    this.config = { ...defaultConfig, ...config };
  }

  public async init() {
    if (!this.bot.id) {
      this.bot.id = await resolveId(this.bot.token);
    }

    const modules = await this.moduleManager.load();

    // Convert modules to commands
    const commands = modules.map((m) => this.moduleToCommand(m));

    // Split and store global and guilded commands
    [this.commands.global, this.commands.guilded] = commands.reduce(
      //technically these aren't sern/handler modules.
      ([globals, guilded], module) => {
        const isPublishableGlobally =
          !module.guildIds || module.guildIds.length === 0;
        if (isPublishableGlobally) {
          return [[module, ...globals], guilded];
        }
        return [globals, [module, ...guilded]];
      },
      [[], []] as [Command[], Command[]],
    );

    // Publish
    if (this.config.publishOnInit) {
      await this.publish(this.commands);
    }
  }

  public async publish(storage: CommandStorage) {
    const prefix = "[Publisher]: ";
    const log = (s: unknown) => {
      if (this.config.logLevel === "normal") {
        this.logger.info({ message: prefix + s });
      }
    };

    if (!this.bot.id) {
      throw new Error("Missing attributes... have you called .init()?");
    }

    // Creating rest
    const rest = new REST().setToken(this.bot.token);

    // Publishing global commands
    if (this.commands.global.length > 0) {
      try {
        const res = (await rest.put(Routes.applicationCommands(this.bot.id), {
          body: storage.global.map((c) => c.toJSON()),
        })) as any;

        log(`Successfully published ${res.length} global commands.`);
      } catch (e) {
        console.error(
          "A fatal error has occurred within the Publisher. Error will be displayed below:",
        );
        throw e;
      }
    }

    // Publishing guild commands
    if (this.commands.guilded.length > 0) {
      // Creating a guild map with all commands for that guild
      const guildIdMap: Map<string, Command[]> = new Map();
      this.commands.guilded.forEach((entry) => {
        const guildIds: string[] = entry.guildIds ?? [];
        if (guildIds) {
          guildIds.forEach((guildId) => {
            if (guildIdMap.has(guildId)) {
              guildIdMap.get(guildId)?.push(entry);
            } else {
              guildIdMap.set(guildId, [entry]);
            }
          });
        }
      });

      for (const [guildId, commands] of guildIdMap.entries()) {
        const res = (await rest.put(
          Routes.applicationGuildCommands(this.bot.id, guildId),
          {
            body: commands,
          },
        )) as any;

        // Checking response
        const result = await res.json();

        if (res.ok) {
          log(guildId + " published successfully");
        } else {
          switch (res.status) {
            case 400: {
              console.error(inspect(result, { depth: Infinity }));
              console.error(
                "Modules with validation errors:" +
                  inspect(
                    Object.keys(result.errors).map(
                      (idx) => commands[idx as any],
                    ),
                  ),
              );
              throw Error(
                "400: Ensure your commands have proper fields and data and nothing left out",
              );
            }
            case 404: {
              console.error(inspect(result, { depth: Infinity }));
              throw Error(
                "404 (Forbidden): Is you application id and/or token correct?",
              );
            }
            case 429: {
              console.error(inspect(result, { depth: Infinity }));
              throw Error("429: To many requests");
            }
          }
        }
      }
    }

    if (this.config.logLevel !== "none") {
      this.logger.info({
        message: prefix + "All commands successfully published.",
      });
    }
  }

  // --------------- Helpers --------------- //

  /**
   * Converts a sern module to a command.
   */
  private moduleToCommand(module: Processed<Module>): Command {
    console.log(module);
    const publish = (module.locals.publish as LocalPublish) || {};
    return {
      guildIds: publish?.guildIds ?? [],
      toJSON() {
        const applicationType = intoApplicationType(module.type);
        const { default_member_permissions, integration_types, contexts } =
          publish;
        return {
          name: module.name,
          type: applicationType,
          description: makeDescription(applicationType, module.description),
          // @ts-ignore
          options: optionsTransformer(module?.options),
          default_member_permissions,
          integration_types,
          contexts,
          name_localizations: module.locals.nloc,
          description_localizations: module.locals.dloc,
        };
      },
    };
  }
}

// -------------------- Plugin ------------------- //

export enum IntegrationContextType {
  GUILD = 0,
  BOT_DM = 1,
  PRIVATE_CHANNEL = 2,
}

/**
 * Valid contexts for posting commands.
 *   0 - Guild
 *   1 - Bot DM
 *   2 - Private Channel
 *   keyof IntegrationContextType
 */
type Contexts = IntegrationContextType | 0 | 1 | 2;

/**
 * Permission Resolvable - Not all permission resolvables that discord supports are supported here
 * Valid permission types:
 *   a single permission from `PermissionFlagsBits`
 *   array of `PermissionFlagsBits`
 *   stringified permissions ex.: "Administrator"
 * V13 djs permissions will not work!
 */
export type ValidMemberPermissions =
  | typeof PermissionFlagsBits //discord.js enum
  | Array<typeof PermissionFlagsBits>
  | bigint;

export interface PublishConfig {
  guildIds?: Array<`${number}`>;
  defaultMemberPermissions?: ValidMemberPermissions;
  integrationTypes?: Array<"Guild" | "User">;
  contexts?: Array<Contexts>;
}

export type ValidPublishOptions =
  | PublishConfig
  | ((absPath: string, module: CommandModule) => PublishConfig);

const IntegrationType = {
  Guild: "0",
  User: "1",
};
/**
 * the publishConfig plugin.
 * If your commandModule requires extra properties such as publishing for certain guilds, you would
 * put those options in there.
 * sets 'publish' on locals field for modules.
 * @param {ValidPublishOptions} config options to configure how this module is published
 */
export const publishConfig = (config: ValidPublishOptions) => {
  return CommandInitPlugin(({ module, absPath }) => {
    if ((module.type & PUBLISHABLE) === 0) {
      return controller.stop(
        "Cannot publish this module; Not of type Both,Slash,CtxUsr,CtxMsg.",
      );
    }
    let _config = config;
    if (typeof _config === "function") {
      _config = _config(absPath, module as CommandModule);
    }
    const {
      contexts,
      defaultMemberPermissions,
      integrationTypes: integration_types,
      guildIds,
    } = _config;
    Reflect.set(module.locals, "publish", {
      guildIds,
      contexts,
      integration_types: integration_types?.map((i) =>
        Reflect.get(IntegrationType, i),
      ),
      default_member_permissions: serializePerms(defaultMemberPermissions),
    });
    return controller.next();
  });
};
