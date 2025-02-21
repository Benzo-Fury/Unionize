import { CommandControlPlugin, CommandType, controller } from "@sern/handler";

export function guildOnly() {
  return CommandControlPlugin<CommandType.Slash>(async (ctx, sdt) => {
    const langManager = sdt.deps.langManager;

    if (!ctx.guild) {
      await ctx.reply({
        content: langManager.getResponse<"text">("plugins.guild_only.fail")
          .content,
        ephemeral: true,
      });
      return controller.stop();
    }
    return controller.next();
  });
}
