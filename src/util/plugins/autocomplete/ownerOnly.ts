import config from "#config";
import {
  CommandControlPlugin,
  controller,
  makePlugin,
  PluginType,
  type SDT,
} from "@sern/handler";
import type { Interaction } from "discord.js";

export function ownerOnly() {
  return makePlugin(PluginType.Control, async (ctx: Interaction, sdt: SDT) => {
    if (!ctx.isAutocomplete()) {
      return controller.next();
    }

    // Getting response
    const langManager = sdt.deps.langManager;
    const response = langManager.getResponse<"text">(
      "plugins.auto_complete.owner_only.fail",
    ).content;

    // Responding
    if (ctx.user.id !== config.ids.users.neo) {
      await ctx.respond([
        {
          name: response,
          value: response,
        },
      ]);
      return controller.stop();
    }

    // Continuing if all good.
    return controller.next();
  });
}
