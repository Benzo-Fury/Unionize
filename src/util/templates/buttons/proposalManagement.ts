/**
 * These buttons are for the management of proposals.
 * When used they fire their corresponding events
 */
import config from "#config";
import { ButtonBuilder, ButtonStyle } from "discord.js";

export type ApproveButtonLabel = "Accept" | "Yes";
export class ApproveButton extends ButtonBuilder {
  private static createId = (s: string) =>
    config.ids.buttons.acceptProposal + s;

  constructor(label: ApproveButtonLabel, propId: string) {
    super({
      style: ButtonStyle.Success,
      custom_id: ApproveButton.createId(propId),
      label,
    });
  }
}

export type DeclineButtonLabel = "Decline" | "No";
export class DeclineButton extends ButtonBuilder {
  private static createId = (s: string) =>
    config.ids.buttons.declineProposal + s;

  constructor(label: DeclineButtonLabel, propId: string) {
    super({
      style: ButtonStyle.Danger,
      custom_id: DeclineButton.createId(propId),
      label,
    });
  }
}

export function createPropButton(
  propId: string,
  buttonType: ApproveButtonLabel | DeclineButtonLabel,
): ButtonBuilder {
  switch (buttonType) {
    case "Accept":
      return new ApproveButton(buttonType, propId);
    case "Decline":
      return new DeclineButton(buttonType, propId);
    case "Yes":
      return new ApproveButton(buttonType, propId);
    case "No":
      return new DeclineButton(buttonType, propId);
  }
}
