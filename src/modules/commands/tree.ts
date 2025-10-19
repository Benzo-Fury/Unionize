import { commandModule } from "#cmdModule";
import { CommandType } from "@sern/handler";
import type { Collection, GuildMember } from "discord.js";
import { HEngine, HGraph, HGraphBuilder, type HRawNode } from "hierarchia";
import type { N4jRelation } from "util/classes/db/neo4j/models/N4jRelation";
import { VisualizationEngine } from "util/classes/local/graph/VisualizationEngine";
import { N4jUser } from "../../util/classes/db/neo4j/models/N4jUser";
import Lang from "../../util/namespaces/Lang";
import { guildOnly } from "../../util/plugins/guildOnly";

export default commandModule({
  type: CommandType.Slash,
  plugins: [guildOnly()],
  description: "Displays your family tree 🌴",
  execute: async (ctx, sdt) => {
    // Defer response ASAP
    // Tree generation can take a while.
    await ctx.interaction.deferReply();
    const user = N4jUser.fromCtx(ctx);

    // Get family tree
    const tree = await user.tree(); // todo: pass max depth here - premium feature

    if (!tree) {
      return ctx.interaction.editReply(
        Lang.getRes<"text">("commands.tree.errors.no_tree"),
      );
    }

    // Ensuring fields exist
    const rels = tree.get("r");
    const usrs = tree.get("u");
    if (rels.length === 0 || usrs.length === 0) {
      return ctx.interaction.editReply(
        Lang.getRes<"text">("commands.tree.errors.no_tree"),
      );
    }

    // N4j does not store usernames
    // They are fetched from the api
    const treeMembers = await ctx.guild!.members.fetch({
      user: usrs.map((n) => n.id),
    });

    // Create top node
    const topNode = createTopNode(
      {
        nodes: usrs,
        relations: rels,
      },
      treeMembers,
    );

    // Use top node to create structure of tree.
    const structure = new HEngine().calculate(topNode);

    console.log(structure, structure.generations[0].groups[0].members[0]);

    // Turn structure into visualization
    const viz = new VisualizationEngine(structure, topNode.id);
    viz.render();

    const buffer = viz.toBuffer();

    return ctx.interaction.editReply({
      files: [
        {
          attachment: buffer,
          name: "tree.png",
        },
      ],
    });
  },
});

/**
 * Converts a tree & corresponding djs members into a Hierarchia
 * compatible raw node.
 *
 * Slightly more efficient than the provided {@link HGraphBuilder} class.
 */
function createTopNode(
  tree: {
    nodes: N4jUser[];
    relations: N4jRelation[];
  },
  members: Collection<string, GuildMember>,
) {
  const rootNode = tree.nodes.find((node) => {
    return !tree.relations.some(
      (rel) => rel.primaryNode === node.id && rel.type === "PARENT_OF",
    );
  });

  if (!rootNode) {
    throw new Error("No root node identifiable in tree");
  }

  // Recursively build tree structure
  function buildNode(userId: string): HRawNode {
    const member = members.get(userId);
    const children = tree.relations
      .filter((rel) => rel.secondaryNode === userId && rel.type === "PARENT_OF")
      .map((rel) => buildNode(rel.secondaryNode.toString()));

    const partners = tree.relations
      .filter(
        (rel) =>
          (rel.primaryNode === userId || rel.secondaryNode === userId) &&
          rel.type === "PARTNER_OF",
      )
      .map((rel) => {
        const partnerId =
          rel.primaryNode === userId ? rel.secondaryNode : rel.primaryNode;
        return buildNode(partnerId.toString());
      });

    return {
      id: userId,
      name: member?.user.username ?? userId,
      children,
      partners,
    };
  }

  return buildNode(rootNode.id);
}
