import lang from "#lang";
import { makeDependencies, Sern, Service } from "@sern/handler";
import { Executor } from "util/classes/db/neo4j/base/Executor.ts";
import { Logger } from "util/classes/local/Logger.ts";
import { isDevMode } from "util/functions/other/isDevMode.ts";
import config from "./config.ts";
import { MDBClient } from "./util/classes/db/mongodb/MDBClient.ts";
import {
  type AuthString,
  N4jClient,
} from "./util/classes/db/neo4j/base/N4jClient.ts";
import { Bot } from "./util/classes/discord/Bot.ts";
import { EVM } from "./util/classes/local/EnvironmentVariableManager.ts";
import { InsightCache } from "./util/classes/local/InsightCache.ts";
import { LangManager } from "./util/classes/local/LangManager.ts";

/**
 * Needs to be created an initialized before everything else as other deps rely on it.
 * Once sern implements a feature that calls `init()` on dependencies in order
 * we can add this to the deps primarily.
 */
const evm = await EVM.new();

await makeDependencies(({ add, swap }) => {
  swap("@sern/logger", new Logger());
  add("EVM", evm);
  add("@sern/client", new Bot());
  add(
    "N4jClient",
    new N4jClient({
      auth: evm.load("N4J_AUTH") as AuthString,
    }),
  );
  add("MDBClient", new MDBClient(evm.load("MONGO_URI")));
  add("Executor", (deps) => new Executor(deps["N4jClient"]));
  add("langManager", (deps) => new LangManager(lang, deps["@sern/client"]));
  add("insightCache", new InsightCache());
});

// Initializing sern with pre defined configuration
Sern.init(config.sern);

await Service("@sern/client").login(evm.load("BOT_TOKEN"));
