import config from "#config";
import type { IntRange } from "ts/types/IntRange";
import type { IGuild } from "util/schemas/guild.schema";
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
  public simplifiedPath: RelationPath;

  constructor(
    private guild: IGuild,
    path: DatabasePath,
  ) {
    // Convert db path to relation path
    const relSimplifier = new RelationSimplifier(path);

    this.simplifiedPath = relSimplifier.simplify();
  }

  public check() {
    // Creating IL
    const localIL = this.calculateIL();

    return localIL <= this.guild.settings.relationships.IL;
  }

  /**
   * Converts the current path attribute into an incest level that can be compared to the guild.
   */
  private calculateIL(): IL {
    let il = 0;
    let greatCount = this.simplifiedPath.filter((r) => r === "great").length;

    // Extract the closest actual relation (e.g., "sibling", "2nd cousin")
    let relation = this.simplifiedPath.filter((r) => r !== "great").join(" ");

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
}
