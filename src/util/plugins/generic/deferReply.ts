import { CommandControlPlugin, CommandType, controller } from "@sern/handler";
import type { Interaction } from "discord.js";

/**
 * A plugin to defer a reply to the interaction.
 */
export function deferReply(ephemeral?: boolean) {
  return CommandControlPlugin<any>(async (i: Interaction) => {
    if (i.isAutocomplete()) {
      throw new Error("Used on autocomplete interaction.");
    }

    await i.deferReply();
    return controller.next();
  });
}
