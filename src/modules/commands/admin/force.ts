import { commandModule } from "#cmdModule";
import { CommandType } from "@sern/handler";
import { ApplicationCommandOptionType } from "discord.js";

export default commandModule({
  type: CommandType.Slash,
  description: "force",

  // In future this command should be:
    // - sub commands like "force marry", "force adopt"

  options: [
    {
      name: "user",
      description: "The ",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  execute: async (ctx, sdt) => {
    const n4j = sdt.deps.N4jDataInterpreter;
    const targetUser = ctx.options.getUser("user")!;

    await n4j.createRelation(
      {
        user1Id: ctx.user.id,
        relation: "PARTNER_OF",
        user2Id: targetUser.id,
        properties: {},
      },
      ctx.guild!.id,
    );

    await ctx.reply(
      `Created a marriage relation between ${ctx.user} and ${targetUser}.`,
    );
  },
});
