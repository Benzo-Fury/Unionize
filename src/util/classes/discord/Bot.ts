import { type Init, Service } from "@sern/handler";
import { Client, type ClientOptions } from "discord.js";

export const defaultOptions: ClientOptions = {
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
};

export class Bot extends Client implements Init {
  public ready = false;

  constructor(options: ClientOptions = defaultOptions) {
    super(options);
  }

  async init() {
    // Logging in
    const evm = Service("EVM");

    await this.login(evm.load("BOT_TOKEN_FILE"));

    // Resolving and storing commands
    await this.application?.commands.fetch();

    this.ready = true;
  }
  async dispose() {
    await this.destroy();
  }
}
