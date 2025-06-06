import { commandModule, CommandType } from "@sern/handler";
import { Proposal } from "../../../util/schemas/proposal.schema";
import Lang from '../../../util/namespaces/Lang'

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
    const proposal = await Proposal.findOne({ _id: sdt.params });

    // Ensuring a proposal actually exists
    if (!proposal) {
      return i.reply({
        content: Lang.getRes<"text">("components.proposal_manage.no_proposal"),
        flags: [
          "Ephemeral"
        ]
      });
    }

    if (proposal.proposeeId !== i.user.id) {
      return i.reply({
        content: Lang.getRes<"text">(
          "components.proposal_manage.proposee_only",
        ),
        flags: [
          "Ephemeral"
        ]
      });
    }

    if (proposal.status === "declined") {
      return i.reply({
        content: Lang.getRes<"text">(
          "components.proposal_manage.already_denied",
        ),
        flags: [
          "Ephemeral"
        ]
      });
    }

    // Mark the proposal as declined
    await proposal.updateOne({ status: "declined" });

    // Defer any update now that all database updates are done
    // We update database first to avoid the user spamming accept buttons
    await i.deferUpdate();
  },
});
