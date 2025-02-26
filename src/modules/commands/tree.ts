import { commandModule } from "#cmdModule";
import { CommandType } from "@sern/handler";
import graphviz from "graphviz";
import { N4jUser } from "../../util/classes/db/neo4j/models/N4jUser";
import { guildOnly } from "../../util/plugins/guildOnly";
import Lang from '../../util/namespaces/Lang';
/**
 * This command is very temporary...
 * at the moment it just uses graphviz to render a low quality and ugly graph to represent family relations.
 *
 * It is in the current plan to change this by using a browser based graph solution and rendering them with a headless browser.
 *
 * The idea is that when the /tree command is used, we mass fetch all the members in the guild from discord.
 * Members we cant fetched are then displayed as a purple unfetchable node.
 * Maybe we can have a command that removes any unfetchable users from the db. Perhaps store unfetchable users in db?
 * This means that in future when creating a graph we need to be able to specify when creating the node what node it is.
 * Should have different commands for admins of server and some for premium. Example:
 * Admins should be able to remove users that arn't in the server anymore from the tree
 */

export default commandModule({
  type: CommandType.Slash,
  plugins: [guildOnly()],
  description: "Displays your family tree 🌴",
  execute: async (ctx, sdt) => {
    await ctx.interaction.deferReply();
    const n4j = sdt.deps.N4jDataInterpreter;
    // Temporarily use graphviz to render a tree in the alpha testing

    const tree = await n4j.matchTree({
      id: ctx.user.id,
      guildId: ctx.guild!.id,
    });

    if (!tree) {
      return ctx.interaction.editReply({
        content: Lang.getRes<"text">("commands.tree.errors.no_tree"),
      });
    }

    // Fetching members
    const members = await ctx.guild!.members.fetch({
      user: tree.nodes.map((n) => n.id),
    });

    // Creating graph with graphviz
    const graph = graphviz.digraph("g");

    tree.nodes.forEach((node) => {
      graph.addNode(node.elementId!, {
        label: members.get(node.id)?.user.username || "Left Server",
      }); // todo: Modify data interpreter so element id is always defined for this method
    });
    tree.relations.forEach((r) => {
      let pu = r.primaryNode;
      let su = r.secondaryNode;

      if (r.primaryNode instanceof N4jUser) {
        pu = r.primaryNode.id;
      }
      if (r.secondaryNode instanceof N4jUser) {
        su = r.secondaryNode.id;
      }

      //@ts-expect-error <- temp solution
      graph.addEdge(pu, su);
    });

    graph.output(
      "png",
      async (b) => {
        await ctx.interaction.editReply({
          files: [b],
        });
      },
      async (e) => {
        await ctx.interaction.editReply({
          content: "It seems an error has occurred.",
        });
      },
    );
  },
});
