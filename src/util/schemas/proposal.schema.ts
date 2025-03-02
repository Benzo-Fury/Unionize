import { type Document, model, Schema, Types } from "mongoose";
import type { LocalRelation } from "util/classes/db/neo4j/models/N4jRelation";
import { daysToMilli } from "../functions/formatting/daysToMilli";
import { id } from "./templates/id";

/**
 * The status of a proposal.
 */
export type ProposalStatus = "pending" | "accepted" | "declined";

export interface IProposal extends Document {
  readonly _id: Types.ObjectId;
  readonly guildId: string;
  readonly proposerId: string;
  readonly proposeeId: string;
  readonly relation: LocalRelation;
  /**
   * The max amount of days a proposal can be pending for.
   * Essentially the proposal will auto decline after this many days:
   */
  readonly maxPendingDays: number;
  status: ProposalStatus;
  /**
   * How long the proposal will exist in the database.
   */
  readonly expiration?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const proposalSchema = new Schema<IProposal>({
  guildId: {
    ...id,
    unique: false,
    index: false, // Indexing disabled due to compound index
  },
  proposerId: {
    ...id,
    unique: false,
    index: false, // Indexing disabled due to compound index
  },
  proposeeId: {
    ...id,
    unique: false,
    index: false, // Indexing disabled due to compound index
  },
  relation: {
    type: String, // Don't resort back to using "reqString" here, it doesn't work.
    required: true,
    immutable: true,
    enum: ["PARENT_OF", "CHILD_OF", "PARTNER_OF"] as LocalRelation[],
  },
  maxPendingDays: {
    type: Number,
    required: true,
    /*
     * Max pending days defaults to half of the expiry (2 days unless specified otherwise)
     */
    default: function () {
      if (!this.expiration) {
        throw new Error(
          "Expiration missing: set expiration or explicitly define maxPendingDays.",
        );
      }

      const now = new Date();
      const expirationTime = new Date(this.expiration).getTime();
      const durationInMillis = expirationTime - now.getTime();

      const days = Math.ceil(durationInMillis / (24 * 60 * 60 * 1000)); // Convert to days
      return Math.floor(days / 2); // Half of the total days
    },
    immutable: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "accepted", "declined"] as ProposalStatus[],
    default: "pending",
    /*
     * Getter for `status`
     *
     * Dynamically calculates the status:
     * - Returns "accepted" or "declined" as-is.
     * - If "pending," checks how long it’s been since creation:
     *   - If it exceeds the allowed pending days, returns "declined."
     *   - Otherwise, returns "pending."
     */
    get: function (this: IProposal, status: ProposalStatus): ProposalStatus {
      const now = new Date();
      const createdAt = this.createdAt!; // Extract creation date
      const elapsedTime = now.getTime() - createdAt.getTime(); // Time elapsed since creation
      const maxPendingDaysMilli = daysToMilli(this.maxPendingDays); // The maximum amount of days a proposal can be pending for in milliseconds

      if (status === "accepted" || status === "declined") {
        return status;
      }

      if (elapsedTime >= maxPendingDaysMilli) {
        return "declined";
      }

      return "pending";
    },
  },
  expiration: {
    type: Date,
    required: false,
    default: (() => {
      // 4 days from now (TTL expiration time)
      const date = new Date();
      date.setDate(date.getDate() + 4);
      return date;
    })(),
    index: {
      expires: 0,
    },
  },
});

// Compound index on proposer, proposee, guild, and status. Ensures only one proposal exists between
// these two users in this guild at any time.
proposalSchema.index(
  { proposerId: 1, proposeeId: 1, guildId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }, // Uniqueness only applies to "pending"
  },
);

export const Proposal = model<IProposal>("Proposal", proposalSchema);
