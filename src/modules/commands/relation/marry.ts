import { commandModule } from "#cmdModule";
import { CommandType } from "@sern/handler";
import { ApplicationCommandOptionType } from "discord.js";
import { RCH } from "util/classes/discord/RelationCommandHandler";
import { guildOnly } from "../../../util/plugins/guildOnly";

export default commandModule({
  type: CommandType.Slash,
  description: "Marry another member 💍",
  plugins: [guildOnly()],
  options: [
    {
      name: "user",
      description: "The user to marry 🙍",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  execute: RCH.handle,
});
