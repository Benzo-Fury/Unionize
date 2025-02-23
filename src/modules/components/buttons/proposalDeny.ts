import { commandModule, CommandType } from "@sern/handler";
import { ProposalModel } from "../../../util/schemas/proposal.schema";

export default commandModule({
  name: "decline-proposal",
  type: CommandType.Button,
  plugins: [],
  execute: async (i, sdt) => {
    // Checking if _id hasn't been passed.
    if (!sdt.params) {
      throw new Error("Missing prop identifier in button id.");
    }

    // Fetch proposal from db
    const proposal = await ProposalModel.findOne({ _id: sdt.params });

    // Ensuring a proposal actually exists
    if (!proposal) {
      return i.reply({
        content: Lang.getRes<"text">("components.proposal_manage.no_proposal"),
        ephemeral: true,
      });
    }

    if (proposal.proposeeId !== i.user.id) {
      return i.reply({
        content: Lang.getRes<"text">(
          "components.proposal_manage.proposee_only",
        ),
        ephemeral: true,
      });
    }

    if (proposal.status === "declined") {
      return i.reply({
        content: Lang.getRes<"text">(
          "components.proposal_manage.already_denied",
        ),
        ephemeral: true,
      });
    }

    // Mark the proposal as declined
    await proposal.updateOne({ status: "declined" });

    // Defer any update now that all database updates are done
    // We update database first to avoid the user spamming accept buttons
    await i.deferUpdate();

    // todo: Check if the button is on the proposal manager or a proposal itself
    // then update the message accordingly. See if we can use templates and whatnot so we are not defining or changing any of the embed fields directly.
    // If the button is on the proposal manager we need to update the page cache somehow.
  },
});
