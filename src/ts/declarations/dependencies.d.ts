/**
 * This file serves as intellisense for sern projects.
 * Types are declared here for dependencies to function properly
 * Service(s) api rely on this file to provide a better developer experience.
 */
import type { CoreDependencies } from "@sern/handler";
import type { Publisher } from "@sern/publisher";
import type { Executor } from "util/classes/db/neo4j/base/Executor";
import type { Bot } from "util/classes/discord/Bot";
import type { EVM } from "util/classes/local/EnvironmentVariableManager";
import type { LangManager } from "util/classes/local/LangManager";
import type { Logger } from "util/classes/local/Logger";
import type { MDBClient } from "../../util/classes/db/mongodb/MDBClient";
import type { N4jClient } from "../../util/classes/db/neo4j/base/N4jClient";
import type { N4jDataInterpreter } from "../../util/classes/db/neo4j/base/N4jDataInterpreter";
import type { InsightCache } from "../../util/classes/local/InsightCache";

/**
 * Note: You usually would not need to modify this unless there is an urgent need to break the contracts provided.
 * You would need to modify this to add your custom Services, however.
 */
declare global {
  interface Dependencies extends CoreDependencies {
    "@sern/client": Bot;
    "@sern/logger": Logger;
    EVM: EVM;
    publisher: Publisher;
    N4jClient: N4jClient;
    Executor: Executor;
    MDBClient: MDBClient;
    langManager: LangManager;
    insightCache: InsightCache;
  }
}

export {};
