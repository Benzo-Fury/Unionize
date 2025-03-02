import config from "#config";
import type { IntRange } from "ts/types/IntRange";
import type { IGuild } from "util/schemas/guild.schema";
import type { LocalRelation } from "../models/N4jRelation";
import {
  type DatabasePath,
  type RelationPath,
  RelationSimplifier,
} from "./RelationSimplifier";

/**
 * The incest level defined on the guild.
 */
export type IL = IntRange<0, 7>;

/**
 * Handles the conversion of processed Neo4j Relationship path into a IL.
 */
export class RelationValidator {
  constructor(
    private guild: IGuild,
    private path: RelationPath,
    private proposedRelation: LocalRelation,
  ) {}

  public check():
    | { valid: false; reason: "Already exists" | "Not allowed" }
    | { valid: true } {
    const generatedIL = this.calculateIL();

    // Checking if the relation already exists
    if (this.doesRelationExists())
      return { valid: false, reason: "Already exists" };
    // Chceck if the generated IL is lower. if yes, we allow, else return false
    else if (generatedIL <= this.guild.settings.relationships.IL) {
      return {
        valid: false,
        reason: "Not allowed",
      };
    } else {
      return { valid: true };
    }
  }

  /**
   * Converts the current path attribute into an incest level that can be compared to the guild.
   */
  private calculateIL(): IL {
    let il = 0;
    let greatCount = this.path.filter((r) => r === "great").length;

    // Extract the closest actual relation (e.g., "sibling", "2nd cousin")
    let relation = this.path.filter((r) => r !== "great").join(" ");

    // Base IL from the closest relation
    il = config.other.ILMap[relation] ?? 0;

    // Adjust IL based on "great" count (more "greats" = lower IL)
    il = Math.max(1, il - Math.floor(greatCount / 2));

    // Handle "times removed"
    const removedMatch = relation.match(/(\d+) times removed/);
    if (removedMatch) {
      const timesRemoved = parseInt(removedMatch[1], 10);
      il = Math.max(1, il - Math.floor(timesRemoved / 2)); // Lower IL for more removals
    }

    return il as IL;
  }

  private doesRelationExists(): boolean {
    const usersRelation = this.path[0];

    return (
      (usersRelation === "partner" && this.proposedRelation === "PARTNER_OF") ||
      (usersRelation === "child" && this.proposedRelation === "CHILD_OF") ||
      (usersRelation === "parent" && this.proposedRelation === "PARENT_OF")
    );
  }
}
