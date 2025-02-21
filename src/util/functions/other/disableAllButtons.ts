import {
  ActionRowBuilder,
  type APIButtonComponent,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

/**
 * Takes an array of action row builders and returns the array with all buttons inside disabled
 */
export function disableAllButtons(
  actionRows: ActionRowBuilder<ButtonBuilder>[],
): ActionRowBuilder<ButtonBuilder>[] {
  return actionRows.map((row) => {
    const newRow = new ActionRowBuilder<ButtonBuilder>();
    row.components.forEach((component) => {
      // Skip link buttons
      if (component.data.style === ButtonStyle.Link) return;
      newRow.addComponents(
        new ButtonBuilder(component.data as APIButtonComponent).setDisabled(
          true,
        ),
      );
    });
    return newRow;
  });
}
