import { commandModule } from "#cmdModule";
import { CommandType } from "@sern/handler";
import { guildOnly } from "../../../util/plugins/guildOnly";

export default commandModule({
  type: CommandType.Slash,
  description: "Run away from your parents 👪",
  plugins: [guildOnly()],
  execute: (ctx) => {
    ctx.reply({
      content:
        "This command is yet to be implemented. Please get your parent to use `/disown`.",
      flags: ["Ephemeral"],
    });
  },
});
