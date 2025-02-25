import lang from "#lang";
import { makeDependencies, Sern } from "@sern/handler";
import { Logger } from "util/classes/local/Logger.ts";
import config from "./config.ts";
import { MDBClient } from "./util/classes/db/mongodb/MDBClient.ts";
import {
  type AuthString,
  N4jClient,
} from "./util/classes/db/neo4j/base/N4jClient.ts";
import { N4jDataInterpreter } from "./util/classes/db/neo4j/base/N4jDataInterpreter.ts";
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
      ip: "neo4j", // Using container name
      auth: evm.load("N4J_AUTH_FILE") as AuthString,
    }),
  );
  add(
    "MDBClient",
    new MDBClient({
      username: evm.load("MONGO_USERNAME_FILE"),
      password: evm.load("MONGO_PASSWORD_FILE"),
    }),
  );
  add(
    "N4jDataInterpreter",
    (deps) => new N4jDataInterpreter(deps["N4jClient"]),
  );
  add("langManager", (deps) => new LangManager(lang, deps["@sern/client"]));
  add("insightCache", new InsightCache());
});

// Initializing sern with pre defined configuration
Sern.init(config.sern);


// Would be call if we have our own commandModule wrapper that exports a debug function.
// We then call this debug function all around commands and when a error occurs it uses the logs to help debug.

// Using lang globally might be causing issues with it not being found or whatever.
