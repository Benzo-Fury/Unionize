import { commandModule } from "#cmdModule";
import { CommandType } from "@sern/handler";
import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import {
  EmbedPaginator,
  Page,
} from "../../util/classes/discord/EmbedPaginator";
import { guildOnly } from "../../util/plugins/guildOnly";
import { Proposal } from "../../util/schemas/proposal.schema";
import { createPropButton } from "../../util/templates/buttons/proposalManagement";
import { Embed } from "../../util/templates/embeds/Embed";
import { ProposalEmbed } from "../../util/templates/embeds/ProposalEmbed";

export default commandModule({
  description: "Opens the proposal manager 💍",
  type: CommandType.Slash,
  plugins: [guildOnly()],
  execute: async (ctx, sdt) => {
    const langManager = sdt.deps.langManager;

    // Creating paginator
    const paginator = new EmbedPaginator(ctx.interaction, sdt);

    // Finding all proposals related to user
    const proposals = (
      await Proposal.find({
        $and: [
          {
            guildId: ctx.guild!.id,
          },
          {
            $or: [{ proposerId: ctx.user.id }, { proposeeId: ctx.user.id }],
          },
        ],
      })
    ).reverse();

    // Ensuring proposals exist
    if (proposals.length === 0) {
      return ctx.reply({
        content: langManager.getResponse<"text">(
          "commands.proposals.errors.none_found",
        ).content,
        flags: ["Ephemeral"],
      });
    }

    // Creating pages
    const pages: Page[] = [
      // Adding dashboard page
      new Page(
        new Embed(
          langManager.getResponse<"embed">(
            "commands.proposals.manager.dash",
          ).embed,
        ),
        [],
      ),
    ];

    proposals.forEach((proposal, index) => {
      // Create the embed
      const embed = new ProposalEmbed(proposal, index);

      // Create the components
      const acceptBut = createPropButton(proposal._id.toString(), "Accept");
      const declineBut = createPropButton(proposal._id.toString(), "Decline");

      if (proposal.status !== "pending") {
        acceptBut.setDisabled(true);
        declineBut.setDisabled(true);
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        acceptBut,
        declineBut,
      );

      // Creating the page
      const page = new Page(embed, [row]);

      // Pushing page to array
      pages.push(page);
    });

    // Pushing pages to paginator
    paginator.addPages(pages);

    // Running pagination
    // The paginator will handle everything from button clicks to lifecycle.
    await paginator.run();
  },
});
