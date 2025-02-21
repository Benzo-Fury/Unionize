import config from "#config";
import { Service } from "@sern/handler";
import { type APIEmbed, EmbedBuilder, type EmbedData } from "discord.js";
import { capitalize } from "../../functions/formatting/capitalize";

// Have tips in the footer of embeds with a lightbulb icon
// Tips:
// The Proposal Manger isn't just for marriage.
// Use /FAQ to see frequently asked questions

export const defaultEmbedOptions = {
  displayInsight: true,
};

/**
 * For simplicity so other modules can just import this.
 */
export type EmbedOptions = typeof defaultEmbedOptions;

/**
 * Custom Unionize embed that extends and adds functionality to the default Discord.js embed builder.
 */
export class Embed extends EmbedBuilder {
  constructor(
    data?: EmbedData | APIEmbed,
    options: EmbedOptions = defaultEmbedOptions,
  ) {
    // Run all calculations
    const insight = Embed.getInsight();

    // Create the config
    const embedConfig = {
      color: config.embedCustomization.default.color,
      footer:
        insight && options.displayInsight
          ? {
              text: `${capitalize(insight.type)}: ${insight.text}`,
              iconUrl: insight.iconURL,
            }
          : undefined,
    };

    // Initialize super with the embed config and user config
    super({
      ...embedConfig,
      ...data,
    });
  }

  /**
   * Returns a random footer.
   */
  private static getInsight() {
    const insightCache = Service("insightCache");

    const insight = insightCache.getRandom();

    if (!insight) {
      return null;
    }

    return {
      type: insight.type,
      text: insight.content,
      iconURL: insight.iconUrl,
    };
  }
}
