import { Service } from "@sern/handler";
import { capitalize } from "../../functions/formatting/capitalize";
import type { Proposal, ProposalStatus } from "../../schemas/proposal.schema";
import { Embed } from "./Embed";

/**
 * A proposal embed that will usually be in a Page.
 */
export class ProposalEmbed extends Embed {
  constructor(proposal: Proposal, index: number) {
    // Resolving lang manager
    const langManager = Service("langManager");

    super({
      ...langManager.getResponse<"embed">(
        "commands.proposals.manager.generic",
        {
          proposer: `<@${proposal.proposerId}>`,
          proposee: `<@${proposal.proposeeId}>`,
          proposal_index: index + 1,
          relation_type: capitalize(proposal.relation),
          status_emoji: ProposalEmbed.calculateStatusEmoji(proposal.status),
          status: capitalize(proposal.status),
        },
      ).embed,
      footer: undefined, // To remove auto footer from Embed class
    });

    this.setColor(this.calculateColor(proposal.status));
  }

  private calculateColor(status: ProposalStatus) {
    switch (status) {
      case "accepted":
        return "#4CAF50";
      case "pending":
        return "#FFC107";
      case "declined":
        return "#F44336";
    }
  }

  /**
   * Converts the status into an emoji.
   * Needs to be static so the method can be accessed before class initialization.
   */
  private static calculateStatusEmoji(status: ProposalStatus) {
    switch (status) {
      case "accepted":
        return "🟢";
      case "pending":
        return "🟡";
      case "declined":
        return "🔴";
    }
  }
}
