import { commandModule, CommandType } from "@sern/handler";
import { RelationSimplifier } from "util/classes/db/neo4j/helpers/RelationSimplifier";
import { RelationValidator } from "util/classes/db/neo4j/helpers/RelationValidator";
import { Guild } from "util/schemas/guild.schema";
import { type N4jSnowflakeRelation } from "../../../util/classes/db/neo4j/models/N4jRelation";
import Lang from "../../../util/namespaces/Lang";
import {
  type IProposal,
  Proposal,
} from "../../../util/schemas/proposal.schema";

export interface CState extends Record<string, unknown> {
  proposal: IProposal;
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
    const proposal = await Proposal.findOne({ _id: sdt.params });

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

    // Generating their relation path
    const rPath = await n4j.generateRelationPath(
      proposal.proposerId,
      proposal.proposeeId,
      proposal.guildId,
    );

    // Only checking path if the users are related somehow
    if (rPath) {
      const guildDoc = await Guild.getById(proposal.guildId);

      const simplifiedPathArray = new RelationSimplifier(rPath).simplify();
      const sP = simplifiedPathArray[0];

      const relValidator = new RelationValidator(
        guildDoc,
        simplifiedPathArray,
        proposal.relation,
      );

      // Checking if the relation already exists
      if (
        (sP === "partner" && proposal.relation === "PARTNER_OF") ||
        (sP === "child" && proposal.relation === "CHILD_OF") ||
        (sP === "parent" && proposal.relation === "PARENT_OF")
      ) {
        return i.reply({
          content: Lang.getRes<"text">(
            "commands.relation_based.errors.relation_already_exists",
            {
              proposee: `<@${proposal.proposeeId}>`,
            },
          ),
          ephemeral: true,
        });
      }

      /**
       * Can the relation be created.
       * Takes into account guild settings.
       */
      const canRelation = relValidator.check();

      if (!canRelation) {
        return i.reply({
          content: Lang.getRes<"text">(
            "commands.relation_based.errors.relation_not_allowed",
            {
              proposee: `<@${proposal.proposeeId}>`,
              relation: simplifiedPathArray.join(" "),
            },
          ),
          ephemeral: true,
        });
      }
    }

    // Mark the proposal as accepted
    await proposal.updateOne({ status: "accepted" });

    // Defer any update now that all database updates are done
    // We update database first to avoid the user spamming accept buttons
    await i.deferUpdate();

    // Finally add the relationship to neo4j
    const data = proposalToRelation(proposal);
    await n4j.createRelation(data, proposal.guildId);
  },
});

/**
 * Helper function to take a Proposal and turn it into a relation
 */
function proposalToRelation(prop: IProposal): N4jSnowflakeRelation {
  const data: N4jSnowflakeRelation = {
    relation: prop.relation,
    user1Id: prop.proposerId,
    user2Id: prop.proposeeId,
    properties: {},
  };

  return data;
}
