import {
  CommandControlPlugin,
  CommandType,
  controller,
  Service,
} from "@sern/handler";

/**
 * Dispose function validates that the bot is ready to accept requests and if not if drops them.
 */
export function dispose() {
  return CommandControlPlugin(async (ctx, sdt) => {
    const client = sdt.deps["@sern/client"];

    if (!client.ready) {
      if ("interaction" in ctx && ctx.interaction.isRepliable()) {
        await ctx.reply({
          content: sdt.deps.langManager.getResponse<"text">(
            "plugins.dispose.fail",
          ).content,
        });
      }
      return controller.stop();
    }

    return controller.next();
  });
}
