// import type { Context, SDT } from "@sern/handler";
// import { ActionRowBuilder, ButtonBuilder } from "discord.js";
// import Lang from "util/namespaces/Lang";
// import { Guild } from "util/schemas/guild.schema";
// import { directRelToDbRel } from "../../functions/other/directRelToDbRel";
// import {
//   type IProposal as DBProposal,
//   ProposalModel,
// } from "../../schemas/proposal.schema";
// import { createPropButton } from "../../templates/buttons/proposalManagement";
// import { Embed } from "../../templates/embeds/Embed";
// import { RelationValidator } from "../db/neo4j/helpers/RelationValidator";
// import { DirectRelation } from "../db/neo4j/models/N4jRelation";
// import { N4jUser } from "../db/neo4j/models/N4jUser";

// /**
//  * Handles the creation and management of proposals between users.
//  *
//  * The Proposal class is responsible for creating a proposal document in the database,
//  * notifying the target user via Discord, and managing any related data for relationship
//  * commands, such as "Marry" and "Adopt." It centralizes the logic needed to process
//  * these proposals, ensuring consistency and code reuse.
//  */
// export class Proposal {
//   private constructor() {}

//   /**
//    * Creates a new instance of the Proposal class
//    */
//   public static async new(ctx: Context, sdt: SDT) {
    

//     let proposalDoc: DBProposal;
//     try {
//       // Creating document in db
//       proposalDoc = await ProposalModel.create({
//         guildId: ctx.guild!.id,
//         proposerId: proposer.id,
//         proposeeId: proposee.id,
//         relation: directRelToDbRel(relation),
//       });
//     } catch (e: any) {
//       if (e.code === 11000) {
//         // Duplicate key error
//         return ctx.interaction.editReply({
//           content: Lang.getRes<"text">(
//             "commands.relation_based.errors.proposal_already_exists",
//             { proposee: proposee.toString() },
//           ),
//         });
//       } else {
//         // Rethrow error if not regarding duplicate key
//         throw e;
//       }
//     }

//     // Sending notification to user & respond to the proposal sender
//     await Promise.all([
//       ctx.interaction.options
//         .getUser("user")!
//         .send(
//           Lang.getRes<"text">("commands.relation_based.dm", {
//             proposer: proposer.toString(),
//           }),
//         )
//         .catch(() => null),
//       ctx.interaction.editReply({
//         content: proposee.toString(),
//         embeds: [
//           new Embed(
//             Lang.getRes<"embed">("commands.relation_based.success.embed").embed,
//           ).setDescription(
//             Lang.getRes<"text">("commands.relation_based.success.descs", {
//               proposer: proposer.toString(),
//               proposee: proposee.toString(),
//               verb: prop.verbifyProposal(relation),
//             }),
//           ),
//         ],
//         components: [
//           new ActionRowBuilder<ButtonBuilder>().addComponents(
//             createPropButton(proposalDoc._id.toString(), "Yes"),
//             createPropButton(proposalDoc._id.toString(), "No"),
//           ),
//         ],
//       }),
//     ]);

//     // Return the proposal
//     return prop;
//   }

//   private verbifyProposal(type: DirectRelation) {
//     switch (type) {
//       case DirectRelation.Child:
//         return "adopt";
//       case DirectRelation.Parent:
//         return "parentify";
//       case DirectRelation.Partner:
//         return "marry";
//     }
//   }
// }
