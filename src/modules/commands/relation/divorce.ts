import { commandModule } from "#cmdModule";
import { CommandType } from "@sern/handler";
import { ApplicationCommandOptionType } from "discord.js";
import { RCH } from "util/classes/discord/RelationCommandHandler";
import { guildOnly } from "../../../util/plugins/guildOnly";

export default commandModule({
  type: CommandType.Slash,
  description: "Divorce one of your partners 💍",
  plugins: [guildOnly()],
  options: [
    {
      name: "partner",
      description: "The partner to divorce 👨",
      required: true,
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      command: {
        execute: RCH.autocomplete,
      },
    },
  ],
  execute: RCH.handle,
});
