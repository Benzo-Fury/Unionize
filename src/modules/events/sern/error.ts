import config from "#config";
import { eventModule, EventType, Service } from "@sern/handler";
import { AttachmentBuilder, type EmbedData } from "discord.js";
import { hexToNum } from "../../../util/functions/formatting/hexToNum";
import { Embed } from "../../../util/templates/embeds/Embed";
import Lang from '../../../util/namespaces/Lang'
export class ErrorEmbed extends Embed {
  constructor(data?: EmbedData) {
    super(
      {
        color: hexToNum(config.embedCustomization.errorColor),
        title: "New Error",
        ...data,
      },
      {
        displayInsight: false,
      },
    );
  }
}

export default eventModule({
  type: EventType.Sern,
  name: "error",
  execute: async (payload) => {
    // Logging
    console.error(payload);

    // Attempting to log in Discord
    if(!("Lang" in globalThis)) return;

    // Resolving client
    const client = Service("@sern/client");

    // Ensuring client is ready
    if (!client.isReady()) throw new Error("Startup error" + payload);

    // Resolving error channel
    const errorChannel = await client.channels.resolve(
      config.ids.channels.errors,
    );

    if (!errorChannel) {
      throw new Error("Missing error channel.", { cause: payload });
    }

    if (!errorChannel.isSendable()) {
      throw new Error("Error channel is not sendable.", { cause: payload });
    }

    if (payload) {
      // Creating embed
      const embed = new ErrorEmbed(
        Lang.getRes<"embed">("events.error", {
          module: payload.module?.name || "N/A",
        }).embed,
      );
      let stack: AttachmentBuilder | undefined = undefined;

      // Adding fields
      if ("reason" in payload) {
        if (payload.reason instanceof Error) {
          // Message field
          embed.addFields({
            name: "Message",
            value: `\`\`\`${payload.reason.message}\`\`\``,
          });

          // Cause field
          if (payload.reason.cause) {
            embed.addFields({
              name: "Cause",
              value: `\`\`\`${payload.reason.cause}\`\`\``,
            });
          }

          // Stack trace
          if (payload.reason.stack) {
            stack = new AttachmentBuilder(Buffer.from(payload.reason.stack), {
              name: "stacktrace.txt",
            });
          }
        } else {
          embed.addFields({
            name: "Reason",
            value: payload.reason,
          });
        }
      }

      // Sending embed
      await errorChannel.send({
        embeds: [embed],
        files: stack ? [stack] : [],
      });
    }
  },
});
