/*
 * Publishes all commands to the discord API. Can be used via the cli or invoked in CI.
 */
import config from "#config";
import {
  type Logging,
  type LogPayload,
  makeDependencies,
  Sern,
  Service,
} from "@sern/handler";
import { Publisher } from "@sern/publisher";
import { Client } from "discord.js";

class Logger implements Logging {
  error(payload: LogPayload<unknown>) {
    console.error(payload.message);
  }
  warning(payload: LogPayload<unknown>) {
    console.warn(payload.message);
  }
  debug(payload: LogPayload<unknown>) {}
  info(payload: LogPayload<unknown>) {}
}

await makeDependencies(({ add, swap }) => {
  swap("@sern/logger", new Logger());
  add("@sern/client", new Client({ intents: [] }));
  add(
    "publisher",
    (deps) =>
      new Publisher(
        deps["@sern/modules"],
        deps["@sern/emitter"],
        deps["@sern/logger"],
      ),
  );
});

Sern.init({
  commands: config.sern.commands,
});

const client = Service("@sern/client");

//@ts-ignore
client.emit("ready", client);

console.log("Successfully published all commands.");

await client.destroy();
