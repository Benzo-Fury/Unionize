import { CommandType } from "@sern/handler";
import { commandModule } from "#cmdModule";
import { ApplicationCommandOptionType } from "discord.js";
import { DirectRelation } from "../../../util/classes/db/neo4j/models/N4jRelation";
import { Proposal } from "../../../util/classes/other/Proposal";
import { guildOnly } from "../../../util/plugins/guildOnly";
import { storeRelation } from "../../../util/plugins/slash/storeRelation";

export default commandModule({
  type: CommandType.Slash,
  description: "Adopt a kid 🧒🏻",
  plugins: [storeRelation(DirectRelation.Child), guildOnly()],
  options: [
    {
      name: "user",
      description: "The user to adopt 🧒🏻",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  execute: Proposal.new,
});
