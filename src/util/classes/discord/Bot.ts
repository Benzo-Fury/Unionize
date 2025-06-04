import { type Init, Service } from "@sern/handler";
import { Client, type ClientOptions } from "discord.js";

export const defaultOptions: ClientOptions = {
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
};

/**
 * Thin wrapper around {@link Client} that exposes `init` and `dispose`
 * methods so it can be consumed as a Sern dependency.
 */
export class Bot extends Client implements Init {
  /** Whether the client has finished initialising. */
  public ready = false;

  /**
   * Creates a new bot instance.
   *
   * @param options Discord.js client options to use.
   */
  constructor(options: ClientOptions = defaultOptions) {
    super(options);
  }

  /**
   * Loads application commands and marks the client as ready.
   * This is invoked automatically by Sern when the dependency is created.
   */
  async init() {
    await this.application?.commands.fetch();

    this.ready = true;
  }

  /**
   * Gracefully destroys the client instance.
   */
  async dispose() {
    await this.destroy();
  }
}
