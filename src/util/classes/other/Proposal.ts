import type { Context, SDT } from "@sern/handler";
import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import Lang from "util/namespaces/Lang";
import { Guild } from "util/schemas/guild.schema";
import { directRelToDbRel } from "../../functions/other/directRelToDbRel";
import {
  type IProposal as DBProposal,
  ProposalModel,
} from "../../schemas/proposal.schema";
import { createPropButton } from "../../templates/buttons/proposalManagement";
import { Embed } from "../../templates/embeds/Embed";
import { RelationValidator } from "../db/neo4j/helpers/RelationValidator";
import { DirectRelation } from "../db/neo4j/models/N4jRelation";
import { N4jUser } from "../db/neo4j/models/N4jUser";

// See if we can add an allowed mentions to mention the user (might work without actually mentioning)
// todo: This could probably just be moved to a function or rethink how it works.
// Proposal events for servers?
/**
 * Handles the creation and management of proposals between users.
 *
 * The Proposal class is responsible for creating a proposal document in the database,
 * notifying the target user via Discord, and managing any related data for relationship
 * commands, such as "Marry" and "Adopt." It centralizes the logic needed to process
 * these proposals, ensuring consistency and code reuse.
 */
export class Proposal {
  private constructor() {}

  /**
   * Creates a new instance of the Proposal class
   */
  public static async new(ctx: Context, sdt: SDT) {
    const prop = new Proposal();

    const n4jInterpreter = sdt.deps.N4jDataInterpreter;

    if (!ctx.interaction.inGuild() || !ctx.guild) {
      throw new Error(
        "Interaction did not come from a guild. Did you forget to add guildOnly plugin?",
      );
    }

    // Extracting data
    // Creating the users (modeling the users) in future could be handled by a plugin and passed via the state
    // However this does not work at the moment due to sern creating a deep clone of everything passed via state.
    const proposer = new N4jUser(ctx.user.id, ctx.guild.id, n4jInterpreter);
    const proposee = new N4jUser(
      ctx.interaction.options.getUser("user")!.id,
      ctx.guild.id,
      n4jInterpreter,
    );
    const relation = sdt.state.relationType as DirectRelation;

    if (!proposee) {
      throw new Error(
        'Proposee does not exist. Did you forget to make the "user" field required?',
      );
    }

    // Ensuring data exists
    if (!relation) {
      throw new Error(
        "Relationship undefined. Did you forget to define it with the plugin?",
      );
    }

    if (proposer.id === proposee.id) {
      return ctx.reply({
        content: Lang.getRes<"text">(
          "commands.relation_based.errors.proposal_self",
        ),
        ephemeral: true,
      });
    }

    if (ctx.interaction.options.getUser("user")?.bot) {
      return ctx.reply({
        content: Lang.getRes<"text">(
          "commands.relation_based.errors.proposal_bot",
        ),
        ephemeral: true,
      });
    }

    await ctx.interaction.deferReply();

    // ------ Validating relation creation ------ //

    // Generating their relation path
    const rPath = await n4jInterpreter.generateRelationPath(
      proposer.id,
      proposee.id,
      ctx.guild.id,
    );

    // Only checking path if the users are related somehow
    if (rPath) {
      const guildDoc = await Guild.getById(ctx.guild.id);

      const relValidator = new RelationValidator(guildDoc, rPath);
      const sP = relValidator.simplifiedPath.join(" ");

      // Checking if the relation already exists
      if (
        (sP === "partner" && relation === DirectRelation.Partner) ||
        (sP === "child" && relation === DirectRelation.Child) ||
        (sP === "parent" && relation === DirectRelation.Parent)
      ) {
        return ctx.interaction.editReply({
          content: Lang.getRes<"text">(
            "commands.relation_based.errors.relation_already_exists",
            {
              proposee: proposee.toString(),
            },
          ),
        });
      }

      /**
       * Can the relation be created.
       * Takes into account guild settings.
       */
      const canRelation = relValidator.check();

      if (!canRelation) {
        return ctx.interaction.editReply({
          content: Lang.getRes<"text">(
            "commands.relation_based.errors.relation_not_allowed",
            {
              proposee: proposee.toString(),
              relation: sP,
            },
          ),
        });
      }
    }

    let proposalDoc: DBProposal;
    try {
      // Creating document in db
      proposalDoc = await ProposalModel.create({
        guildId: ctx.guild!.id,
        proposerId: proposer.id,
        proposeeId: proposee.id,
        relation: directRelToDbRel(relation),
      });
    } catch (e: any) {
      if (e.code === 11000) {
        // Duplicate key error
        return ctx.interaction.editReply({
          content: Lang.getRes<"text">(
            "commands.relation_based.errors.proposal_already_exists",
            { proposee: proposee.toString() },
          ),
        });
      } else {
        // Rethrow error if not regarding duplicate key
        throw e;
      }
    }

    // Sending notification to user & respond to the proposal sender
    await Promise.all([
      ctx.interaction.options
        .getUser("user")!
        .send(
          Lang.getRes<"text">("commands.relation_based.dm", {
            proposer: proposer.toString(),
          }),
        )
        .catch(() => null),
      ctx.interaction.editReply({
        content: proposee.toString(),
        embeds: [
          new Embed(
            Lang.getRes<"embed">("commands.relation_based.success.embed").embed,
          ).setDescription(
            Lang.getRes<"text">("commands.relation_based.success.descs", {
              proposer: proposer.toString(),
              proposee: proposee.toString(),
              verb: prop.verbifyProposal(relation),
            }),
          ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            createPropButton(proposalDoc._id.toString(), "Yes"),
            createPropButton(proposalDoc._id.toString(), "No"),
          ),
        ],
      }),
    ]);

    // Return the proposal
    return prop;
  }

  private verbifyProposal(type: DirectRelation) {
    switch (type) {
      case DirectRelation.Child:
        return "adopt";
      case DirectRelation.Parent:
        return "parentify";
      case DirectRelation.Partner:
        return "marry";
    }
  }
}
