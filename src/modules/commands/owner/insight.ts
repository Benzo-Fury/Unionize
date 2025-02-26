import { commandModule } from "#cmdModule";
import config from "#config";
import { CommandType, type ControlPlugin, Service } from "@sern/handler";
import { publishConfig } from "@sern/publisher";
import {
  type ApplicationCommandOptionChoiceData,
  ApplicationCommandOptionType,
  AutocompleteInteraction,
} from "discord.js";
import { Embed } from "util/templates/embeds/Embed";
import { capitalize } from "../../../util/functions/formatting/capitalize";
import { lazyFilterArray } from "../../../util/functions/other/lazyFilterArray";
import { ownerOnly as autocompleteOwnerOnly } from "../../../util/plugins/autocomplete/ownerOnly";
import { ownerOnly } from "../../../util/plugins/ownerOnly";
import {
  type IInsight,
  InsightModel,
  type InsightType,
} from "../../../util/schemas/insight.schema";
import Lang from '../../../util/namespaces/Lang'
export default commandModule({
  type: CommandType.Slash,
  plugins: [
    publishConfig({
      guildIds: [config.ids.guilds.neoDevelops as `${number}`], // sern bug?
    }),
    ownerOnly(),
  ],
  description: "Insight manager",
  options: [
    {
      name: "add",
      description: "Adds a new insight 🧠",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "The type of the insight 📚",
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: "fact",
              value: "fact",
            },
            {
              name: "tip",
              value: "tip",
            },
            {
              name: "other",
              value: "other",
            },
          ],
          required: true,
        },
        {
          name: "content",
          description: "The content of the insight 📝",
          type: ApplicationCommandOptionType.String,
          required: true,
          min_length: 1,
          max_length: config.database.collections.insight.maxLength,
        },
        {
          name: "icon-url",
          description: "The icon of the insight ⭐",
          type: ApplicationCommandOptionType.String,
        },
        {
          name: "priority",
          description: "A priority rating 📌",
          type: ApplicationCommandOptionType.Number,
        },
      ],
    },
    {
      name: "show",
      description: "Shows a specific insight 🧠",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "insight",
          description: "The insight to show 📚",
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: true,
          command: {
            onEvent: [autocompleteOwnerOnly() as ControlPlugin],
            execute: respondToAutocomplete,
          },
        },
      ],
    },
    {
      name: "delete",
      description: "Deletes a insight 🧠",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "insight",
          description: "The insight to delete 📚",
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: true,
          command: {
            onEvent: [autocompleteOwnerOnly() as ControlPlugin],
            execute: respondToAutocomplete,
          },
        },
      ],
    },
  ],
  execute: async (ctx, sdt) => {
    switch (ctx.options.getSubcommand()) {
      case "add": {
        const type = ctx.options.getString("type")! as InsightType;
        const content = ctx.options.getString("content")!;
        const addedById = ctx.user.id;

        // Add insight to the db
        const insight = await InsightModel.create({
          type,
          content,
          priority: ctx.options.getNumber("priority") || undefined,
          iconUrl: ctx.options.getString("icon-url"),
          addedBy: addedById,
        });

        // Add insight to insight cache
        const insightCache = sdt.deps.insightCache;
        insightCache.add([insight]);

        await ctx.reply(
          Lang.getRes<"text">("commands.insight.add.success", {
            type,
            content,
          }),
        );
        break;
      }
      case "show": {
        // Extracting insight id
        const id = ctx.interaction.options.getString("insight")!;

        // Getting insight from db
        const insight = await InsightModel.findOne({ _id: id });

        // Ensuring insight exists
        if (!insight) {
          return ctx.reply({
            content: Lang.getRes<"text">(
              "commands.insight.show.errors.insight_nonexistent",
            ),
            ephemeral: true,
          });
        }

        // Sending insight
        await ctx.reply({
          embeds: [
            new Embed(
              Lang.getRes<"embed">("commands.insight.show.success", {
                type: capitalize(insight.type),
                priority: insight.priority,
                content: insight.content,
                iconUrl: insight.iconUrl || "https://blankwebsite.com/",
                addedBy: `<@${insight.addedBy}>`,
              }).embed,
              {
                displayInsight: false, // Turning off insights in footer
              },
            ),
          ],
        });
        break;
      }
      case "delete": {
        // Extracting insight id
        const id = ctx.interaction.options.getString("insight")!;

        await InsightModel.deleteOne({ _id: id });

        await ctx.reply(Lang.getRes<"text">("commands.insight.delete.success"));
        break;
      }
    }
  },
});

async function respondToAutocomplete(i: AutocompleteInteraction) {
  // Resolve insightCache
  const insightCache = Service("insightCache");

  // Fuzzy match related insights
  const responseData = fuzzyMatchInsight(
    i.options.getFocused(),
    insightCache.getPool(),
  );

  await i.respond(responseData);
}

/**
 * This will fuzzy match any insights that content includes the passed string.
 * It lazy filters the array to avoid reloading the entire insight dataset into memory again.
 */
function fuzzyMatchInsight(s: string, insights: IInsight[]) {
  const filteredInsights = lazyFilterArray<IInsight>(insights, (i) =>
    i.content.toLowerCase().includes(s.toLowerCase()),
  );

  const results: ApplicationCommandOptionChoiceData[] = [];
  for (const insight of filteredInsights) {
    if (results.length > 24) break; // Limit to 25 results
    results.push({ name: insight.content, value: insight._id.toString() });
  }

  return results;
}
