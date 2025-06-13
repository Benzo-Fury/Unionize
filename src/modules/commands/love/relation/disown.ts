import { commandModule } from "#cmdModule";
import { CommandType } from "@sern/handler";
import { ApplicationCommandOptionType } from "discord.js";
import { RCH } from "util/classes/discord/RelationCommandHandler";
import { guildOnly } from "../../../../util/plugins/guildOnly";

export default commandModule({
  type: CommandType.Slash,
  description: "Disown one of your children 🧒🏻",
  plugins: [guildOnly()],
  options: [
    {
      name: "child",
      description: "The child to disown 🧒🏻",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
      command: {
        execute: RCH.autocomplete,
      },
    },
  ],
  execute: RCH.handle,
});
