import lang from "#lang";
import { makeDependencies, Sern, Service } from "@sern/handler";
import { Executor } from "util/classes/db/neo4j/base/Executor.ts";
import { Logger } from "util/classes/local/Logger.ts";
import config from "./config.ts";
import { MDBClient } from "./util/classes/db/mongodb/MDBClient.ts";
import { N4jClient } from "./util/classes/db/neo4j/base/N4jClient.ts";
import { Bot } from "./util/classes/discord/Bot.ts";
import { InsightCache } from "./util/classes/local/InsightCache.ts";
import { LangManager } from "./util/classes/local/LangManager.ts";

await makeDependencies(({ add, swap }) => {
  swap("@sern/logger", new Logger());
  add("@sern/client", new Bot());
  add(
    "N4jClient",
    new N4jClient({
      auth: Bun.env.N4J_AUTH,
    }),
  );
  add("MDBClient", new MDBClient(Bun.env.MONGO_URI));
  add("Executor", (deps) => new Executor(deps["N4jClient"]));
  add("langManager", (deps) => new LangManager(lang, deps["@sern/client"]));
  add("insightCache", new InsightCache());
});

// Initializing sern with pre defined configuration
Sern.init(config.sern);

await Service("@sern/client").login(Bun.env.DISCORD_TOKEN);
