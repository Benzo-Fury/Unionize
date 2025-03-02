import { Embed } from "#embed";
import type { Context, SDT } from "@sern/handler";
import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import { directRelToDbRel } from "util/functions/other/directRelToDbRel";
import Lang from "util/namespaces/Lang";
import { Guild } from "util/schemas/guild.schema";
import { Proposal } from "util/schemas/proposal.schema";
import { createPropButton } from "util/templates/buttons/proposalManagement";
import { RelationSimplifier } from "../db/neo4j/helpers/RelationSimplifier";
import { RelationValidator } from "../db/neo4j/helpers/RelationValidator";
import { DirectRelation } from "../db/neo4j/models/N4jRelation";
import { N4jUser } from "../db/neo4j/models/N4jUser";

/**
 * The Relation Command Handler is responsible for handling interactions from relation based commands.
 *
 * Commands should call its static handle methods.
 */
export class RCH {
  private static createCommands = ["marry", "adopt", "parentify"]; // Use config
  private static deleteCommands = ["divorce", "disown", "emancipate"]; // Use config

  public static handle(ctx: Context, sdt: SDT) {
    const cmdName = sdt.module.name;

    if (RCH.createCommands.includes(cmdName)) {
      RCH.handleRelationCreateCommand(ctx, sdt);
    } else if (RCH.deleteCommands.includes(cmdName)) {
      RCH.handleRelationDeleteCommand(ctx, sdt);
    } else {
      throw new Error("Non-relation command called the handle method");
    }
  }

  /**
   * Handles `/marry`, `/adopt`, and `/parentify`.
   */
  private static async handleRelationCreateCommand(ctx: Context, sdt: SDT) {
    if (!ctx.interaction.inGuild() || !ctx.guild) {
      throw new Error(
        "Interaction did not come from a guild. Did you forget to add guildOnly plugin?",
      );
    }

    // Extracting data
    const n4j = sdt.deps.N4jDataInterpreter;
    // Creating the users (modeling the users) in future could be handled by a plugin and passed via the state
    // However this does not work at the moment due to sern creating a deep clone of everything passed via state.
    const proposer = new N4jUser(ctx.user.id, ctx.guild.id, n4j);
    const proposee = new N4jUser(
      ctx.interaction.options.getUser("user")!.id,
      ctx.guild.id,
      n4j,
    );
    const relation = sdt.state.relationType as DirectRelation;

    // ------------------- Running Checks ------------------- //

    if (!proposee) {
      throw new Error(
        'Proposee does not exist. Did you forget to make the "user" field required?',
      );
    }

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

    // Checking if proposal already exists
    let proposalDoc = await Proposal.findOne({
      proposerId: proposer.id,
      proposee: proposee.id,
      guildId: ctx.guild.id,
    });

    // Deferring as it may now take a while to respond
    await ctx.interaction.deferReply();

    //  ---------------- Validating Relation ---------------- //

    // Getting the guild doc
    const guildDoc = await Guild.getById(ctx.guild.id);

    // Generating relation path
    const relationPath = await n4j.generateRelationPath(
      proposer.id,
      proposee.id,
      ctx.guild.id,
    );

    if (relationPath) {
      // Simplifying the path
      const simplifiedPath = new RelationSimplifier(relationPath).simplify();

      // Validating relation
      const res = new RelationValidator(
        guildDoc,
        simplifiedPath,
        relation,
      ).check();

      if (!res.valid) {
        if (res.reason === "Already exists") {
          return ctx.interaction.editReply({
            content: Lang.getRes<"text">(
              "commands.relation_based.errors.relation_already_exists",
              {
                proposee: proposee.toString(),
              },
            ),
          });
        } else {
          return ctx.interaction.editReply({
            content: Lang.getRes<"text">(
              "commands.relation_based.errors.relation_not_allowed",
              {
                proposee: proposee.toString(),
                relation: simplifiedPath.join(" "), // Is an array
              },
            ),
          });
        }
      }
    }

    // Relation is valid from this point onwards

    // Create the proposal
    try {
      // Creating document in db
      proposalDoc = await Proposal.create({
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
              verb: RCH.verbifyProposal(relation),
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
  }

  /**
   * Handles `/divorce`, `/disown`, and `/emancipate`.
   */
  private static handleRelationDeleteCommand(ctx: Context, sdt: SDT) {}

  // ------------- Helpers -------------
  private static verbifyProposal(type: DirectRelation) {
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
