import { Embed } from "#embed";
import type { Context, SDT } from "@sern/handler";
import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
} from "discord.js";
import Lang from "util/namespaces/Lang";
import { Guild } from "util/schemas/guild.schema";
import { Proposal } from "util/schemas/proposal.schema";
import { createPropButton } from "util/templates/buttons/proposalManagement";
import { RelationSimplifier } from "../db/neo4j/helpers/RelationSimplifier";
import { RelationValidator } from "../db/neo4j/helpers/RelationValidator";
import type { LocalRelation } from "../db/neo4j/models/N4jRelation";
import { N4jUser, N4jUserMap } from "../db/neo4j/models/N4jUser";

export type RelationCreateCommandName = "marry" | "adopt" | "parentify";
export type RelationDeleteCommandName = "divorce" | "disown" | "emancipate";
export type RelationCommandName =
  | RelationCreateCommandName
  | RelationDeleteCommandName;

/**
 * The Relation Command Handler is responsible for handling interactions from relation based commands.
 *
 * Commands should call its static handle methods.
 */
export class RCH {
  private static createCommands: RelationCreateCommandName[] = [
    "marry",
    "adopt",
    "parentify",
  ]; // Use config
  private static deleteCommands: RelationDeleteCommandName[] = [
    "divorce",
    "disown",
    "emancipate",
  ]; // Use config

  public static async handle(ctx: Context, sdt: SDT) {
    const cmdName = sdt.module.name as any; // Do not cast to "RelationCommandName"... We don't know it is that type here

    if (RCH.createCommands.includes(cmdName)) {
      await RCH.handleRelationCreateCommand(ctx, cmdName);
    } else if (RCH.deleteCommands.includes(cmdName)) {
      await RCH.handleRelationDeleteCommand(ctx, cmdName);
    } else {
      throw new Error("Non-relation command called the handle method");
    }
  }

  public static async autocomplete(i: AutocompleteInteraction, sdt: SDT) {
    if (!i.guild) {
      throw new Error(
        "Guild not defined. Did you forget to add guildOnly plugin?",
      );
    }

    const moduleName = sdt.module.name as any; // Do not cast to "RelationCommandName"... We don't know it is that type here

    if (
      !RCH.createCommands.includes(moduleName) &&
      !RCH.deleteCommands.includes(moduleName)
    ) {
      throw new Error("Autocomplete handler called outside relation command");
    }

    // Create the user
    const user = N4jUser.fromInteraction(i);

    // Getting all user from the database.
    let users: N4jUserMap; // ----------> Something seems to be super slow at responding (probably neo4j but investigate)
    switch (moduleName as RelationCommandName) {
      case "disown":
      case "adopt":
        users = await user.children();
        break;
      case "emancipate":
      case "parentify":
        users = await user.parents();
        break;
      case "divorce":
      case "marry":
        users = await user.partners();
        break;
    }

    // Checking if any were returned
    if (users.size === 0) {
      return i.respond([]);
    }

    // Resolving children as guild members
    const members = await users.toMembers(i.guild);

    return i.respond(
      // Mapping the members to response objects
      // Displayname is used for the user to see and id is used as value
      members.map((m) => ({ name: m.displayName, value: m.user.id })),
    );
  }

  /**
   * Handles `/marry`, `/adopt`, and `/parentify`.
   */
  private static async handleRelationCreateCommand(
    ctx: Context,
    command: RelationCreateCommandName,
  ) {
    if (!ctx.interaction.inGuild() || !ctx.guild) {
      throw new Error(
        "Interaction did not come from a guild. Did you forget to add guildOnly plugin?",
      );
    }

    // Creating the users (modeling the users) in future could be handled by a plugin and passed via the state
    // However this does not work at the moment due to sern creating a deep clone of everything passed via state.
    const proposer = N4jUser.fromCtx(ctx);
    const proposee = N4jUser.fromOptions(ctx, "user", "user");
    const relation = RCH.commandNameToRelation(command);

    // ------------------- Running Checks ------------------- //

    if (!proposee) {
      throw new Error(
        'Proposee does not exist. Did you forget to make the "user" field required?',
      );
    }

    if (proposer.id === proposee.id) {
      return ctx.reply({
        content: Lang.getRes<"text">(
          "commands.relation_based.errors.proposal_self",
        ),
        flags: [
          "Ephemeral"
        ]
      });
    }

    if (ctx.interaction.options.getUser("user")?.bot) {
      return ctx.reply({
        content: Lang.getRes<"text">(
          "commands.relation_based.errors.proposal_bot",
        ),
        flags: [
          "Ephemeral"
        ]
      });
    }

    // Checking if proposal already exists
    let proposalDoc = await Proposal.findOne({
      proposerId: proposer.id,
      proposeeId: proposee.id,
      guildId: ctx.guild.id,
    });

    // Deferring as it may now take a while to respond
    await ctx.interaction.deferReply();

    //  ---------------- Validating Relation ---------------- //

    // Getting the guild doc
    const guildDoc = await Guild.getById(ctx.guild.id);

    // Generating relation path
    const relationPath = await proposer.pathTo(proposee);

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
      proposalDoc = await Proposal.create({
        guildId: ctx.guild!.id,
        proposerId: proposer.id, // Do not worry about swapping proposer and proposee... data interpreter will handle
        proposeeId: proposee.id,
        relation: relation,
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
          Lang.getRes<"text">("commands.relation_based.dm.create", {
            proposer: proposer.toString(),
          }),
        )
        .catch(() => null),
      ctx.interaction.editReply({
        content: proposee.toString(),
        embeds: [
          new Embed(
            Lang.getRes<"embed">(
              "commands.relation_based.success.create.embed",
            ).embed,
          ).setDescription(
            Lang.getRes<"text">(
              "commands.relation_based.success.create.descs",
              {
                proposer: proposer.toString(),
                proposee: proposee.toString(),
                verb: command,
              },
            ),
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
  private static async handleRelationDeleteCommand(
    ctx: Context,
    commandName: RelationDeleteCommandName,
  ) {
    if (!ctx.guild) {
      throw new Error("Guild not defined.");
    }

    const relation = RCH.commandNameToRelation(commandName);
    const primaryUser = N4jUser.fromCtx(ctx);
    let secondaryUsers = new N4jUserMap();

    switch (relation) {
      case "PARENT_OF": {
        const u = N4jUser.fromOptions(ctx, "child");
        secondaryUsers.set(u.id, u);
        await primaryUser.disown(u);
        break;
      }
      case "PARTNER_OF": {
        const u = N4jUser.fromOptions(ctx, "partner");
        secondaryUsers.set(u.id, u);
        await primaryUser.divorce(u);
        break;
      }
      case "CHILD_OF":
        const uS = await primaryUser.parents();
        for (const u of uS.values()) {
          secondaryUsers.set(u.id, u);
        }
        await primaryUser.emancipate();
        break;
    }

    // Respond to interaction
    await ctx.reply(
      Lang.getRes<"text">(
        secondaryUsers.size === 1
          ? "commands.relation_based.success.delete"
          : "commands.relation_based.success.delete_plural",
        {
          verb: commandName,
          noun: this.nounifyProposal(relation),
          proposee1: secondaryUsers.entries().next().value![1].toString(),
          proposee2: secondaryUsers.entries().next().value![1].toString(),
        },
      ),
    );

    // Converting to guild members and accessing their "User" via that.
    // This allows us to get all the member users at once rather the user iteself one at a time from the api
    const secondaryMembers = await secondaryUsers.toMembers(ctx.guild);

    for (const member of secondaryMembers.values()) {
      await member.user.send(
        Lang.getRes<"text">("commands.relation_based.dm.delete", {
          proposer: primaryUser.toString(),
          verb: commandName,
        }),
      );
    }
  }

  // ------------- Helpers ------------- //

  /**
   * Converts the commands name into a relation.
   *
   * @example
   * "Parentify" -> "PARENT_OF"
   */
  private static commandNameToRelation(
    name: RelationCommandName,
  ): LocalRelation {
    switch (name) {
      case "adopt":
      case "disown":
        return "PARENT_OF"; // Do not swap these. Think of it proposer is a PARENT_OF proposee
      case "parentify":
      case "emancipate":
        return "CHILD_OF"; // Do not swap these. Think of it proposer is a CHILD_OF proposee
      case "marry":
      case "divorce":
        return "PARTNER_OF";
    }
  }

  private static nounifyProposal(type: LocalRelation) {
    switch (type) {
      case "CHILD_OF":
        return "child";
      case "PARENT_OF":
        return "parent";
      case "PARTNER_OF":
        return "partner";
    }
  }
}

// todo: Should we have a global cooldown handled via a default plugin that forces users to wait 1 second between each command.
// This should hopefully mitigate alot of issues where users spam commnads.
// Idealy it would be amazing if we could see when a command finishs and then allow for a new command to be sent.

// Ask if sern implements a way to tell if a command has resolved yet.
// sern should implement a way where commands can be fetched and if they have not yet been resolved then they can be terminated
