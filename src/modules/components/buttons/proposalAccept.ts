import { commandModule, CommandType } from "@sern/handler";
import {
  DirectRelation,
  type N4jSnowflakeRelation,
} from "../../../util/classes/db/neo4j/models/N4jRelation";
import {
  type Proposal,
  ProposalModel,
} from "../../../util/schemas/proposal.schema";

export interface CState extends Record<string, unknown> {
  proposal: Proposal;
}

export default commandModule({
  name: "accept-proposal",
  type: CommandType.Button,
  plugins: [],
  execute: async (i, sdt) => {
    // Extracting deps
    const n4j = sdt.deps.N4jDataInterpreter;

    // Checking if _id hasn't been passed.
    if (!sdt.params) {
      throw new Error("Missing prop identifier in button id.");
    }

    // Fetch proposal from db
    const proposal = await ProposalModel.findOne({ _id: sdt.params });

    // Ensuring a proposal actually exists
    if (!proposal) {
      return i.reply({
        // Using edit reply as interaction already deferred
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

    // todo: we need to do some calculations here to make sure this relation can be created.
    // Unsure how we want to handle this weather the guild should have a incest level or something.
    // This calculation also needs to be completed when the proposal is sent and recalculated upon being accepted.

    // Mark the proposal as accepted
    await proposal.updateOne({ status: "accepted" });

    // Defer any update now that all database updates are done
    // We update database first to avoid the user spamming accept buttons
    await i.deferUpdate();

    // Finally add the relationship to neo4j
    const data = proposalToRelation(proposal);
    await n4j.createRelation(data, proposal.guildId);

    // todo: Check if the button is on the proposal manager or a proposal itself
    // then update the message accordingly. See if we can use templates and whatnot so we are not defining or changing any of the embed fields directly.
    // If the button is on the proposal manager we need to update the page cache somehow.
  },
});

/**
 * Helper function to take a Proposal and turn it into a relation
 */
function proposalToRelation(prop: Proposal): N4jSnowflakeRelation {
  const data: N4jSnowflakeRelation = {
    relation:
      prop.relation === "partner"
        ? DirectRelation.Partner
        : DirectRelation.Parent,
    user1Id: prop.proposerId,
    user2Id: prop.proposeeId,
  };

  // Swap users if child relation
  if (prop.relation === "child") {
    const u1 = data.user1Id;
    data.user1Id = data.user2Id;
    data.user2Id = u1;
  }

  return data;
}
