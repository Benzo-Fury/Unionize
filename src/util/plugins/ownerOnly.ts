import config from "#config";
import { CommandControlPlugin, CommandType, controller } from "@sern/handler";

export function ownerOnly() {
  return CommandControlPlugin<CommandType.Slash>(async (ctx, sdt) => {
    const langManager = sdt.deps.langManager;

    if (ctx.interaction.user.id !== config.ids.users.neo) {
      await ctx.reply(
        langManager.getResponse<"text">("plugins.owner_only.fail"),
      );
      return controller.stop();
    }
    return controller.next();
  });
}
