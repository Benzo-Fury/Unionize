/*
 * This file is a modified version of code originally from Marriage Bot
 * (https://github.com/Voxel-Fox-Ltd/MarriageBot/) by Voxel Fox, licensed under the
 * GNU Affero General Public License v3.0 (AGPL-3.0).
 *
 * Modifications made by Neo (author) to adapt the code for JavaScript on 06/02/2025.
 *
 * This file is distributed under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * Visit https://www.gnu.org/licenses/agpl-3.0.html for details one the license.
 */
import type { IntRange } from "ts/types/IntRange";
import type { DirectRelation } from "../models/N4jRelation";

/**
 * A base relationship that the validator could return.
 */
export type BaseRelationships =
  | "parent"
  | "child"
  | "partner"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "aunt/uncle"
  | "niece/nephew"
  | "cousin"
  | "grandniece/nephew"
  | "parent-in-law";

/**
 * A cousin relationship that could be returned.
 */
export type CousinRelationships =
  | `${number}st`
  | `${number}nd`
  | `${number}rd`
  | `${number}th`
  | `${number}`
  | "time"
  | "times"
  | "removed"
  | "cousin";

/**
 * A relationship with any number of "great" prefixes.
 */
export type WithGreatPrefix<T extends string, R extends number> = R extends 0
  ? T
  : T | `great ${WithGreatPrefix<T, IntRange<1, R>>}`;

export type Relation = "great" | BaseRelationships | CousinRelationships;

/**
 * A database path returned from the database.
 *
 * @example
 * const dbPath: DatabasePath = ["PARENT_OF", "PARENT_OF", "PARENT_OF"]; // (["parent's" "parent's" "parent"])
 */
export type DatabasePath = DirectRelation[];

/**
 * A processed version of the raw relationship path.
 * Will be a human readable version.
 *
 * @example
 * const relPath: ProcessedRelationPath = ["great", "grandparent"]; // (parents parents parent)
 */
export type RelationPath = Relation[];

/**
 * Represents a operation called in the simplifier.
 */
export type Operation = (p: string) => string;

/**
 * Takes a database path and simplifys it to be human readable.
 */
export class RelationSimplifier {
  constructor(private path: DatabasePath) {}

  public simplify(): RelationPath {
    let path = this.path.join(" ");

    const allOperations: Operation[] = [
      ...this.converterOperations,
      ...Array(5)
        .fill(this.preOperations)
        .flatMap((op) => op), // Repeat preOperations 5 times
      ...this.cousinOperations,
      ...this.primaryOperations,
      ...this.shortOperations,
      ...this.postOperations,
      ...this.shortOperations,
    ];

    for (const op of allOperations) {
      path = op(path);
    }

    return path.split(" ") as RelationPath;
  }

  /**
   * Operations to convert database words into more readable ones.
   *
   * @example
   * "PARENT_OF PARENT_OF PARENT_OF" -> "parent's parent's parent"
   */
  private converterOperations: Operation[] = [
    (p) => p.replaceAll("PARENT_OF", "parent"),
    (p) => p.replaceAll("PARTNER_OF", "partner"),
    (p) => p.replaceAll("CHILD_OF", "child"),
    (p) => {
      // Adding "'s" to required words
      let splitPath = p.split(" ");

      return splitPath
        .map((item, i) => (i !== splitPath.length - 1 ? item + "'s" : item))
        .join(" ");
    },
  ];

  /**
   * Operations that cut down redundancies.
   *
   * @example
   * "parents's partner" -> "parent"
   */
  private preOperations: Operation[] = [
    (p) => p.replaceAll("parent's partner", "parent"),
    (p) => p.replaceAll("partner's child", "child"),
    (p) => p.replaceAll("child's parent", ""),
    (p) => p.replaceAll(" 's", ""),
    (p) => p.replaceAll("  ", " "),
    (p) => (p.startsWith("'s") ? p.slice(2) : p), // Strip out leading `'s`,
    (p) => p.trim(), // Strip leading and trailing whitespace
  ];

  private cousinOperations: Operation[] = [
    (p) => p.replaceAll(this.cousinMatcher, (m) => this.getCousinString([m])),
  ];

  /**
   * Operations to replace phrases essentially.
   *
   * @example
   * "parent's child" -> "sibling"
   */
  private primaryOperations: Operation[] = [
    (p) => p.replaceAll("parent's sibling", "aunt/uncle"),
    (p) => p.replaceAll("aunt/uncle's child", "cousin"),
    (p) => p.replaceAll("parent's child", "sibling"),
    (p) => p.replaceAll("sibling's child", "niece/nephew"),
    (p) => p.replaceAll("sibling's partner's child", "niece/nephew"),
    (p) => p.replaceAll("parent's niece/nephew", "cousin"),
    (p) => p.replaceAll("aunt/uncle's child", "cousin"),
    (p) => p.replaceAll("niece/nephew's sibling", "niece/nephew"),
    (p) => p.replaceAll("niece/nephew's child", "grandniece/nephew"),
    (p) => p.replaceAll("grandgrandniece/nephew", "great grandniece/nephew"),
    (p) => p.replaceAll("partner's parent", "parent-in-law"),
  ];

  /**
   * Operations to shorten strings of the same word.
   *
   * @example
   * "child's child" -> "grandchild"
   */
  private shortOperations = [
    (str: string) =>
      str.replace(/((?:child's )+)child/g, (match, p1) => {
        return (
          "great ".repeat((p1.match(/ /g) || []).length - 1) + "grandchild"
        );
      }),
    (str: string) =>
      str.replace(/((?:parent's )+)parent/g, (match, p1) => {
        return (
          "great ".repeat((p1.match(/ /g) || []).length - 1) + "grandparent"
        );
      }),
    (str: string) => str.replaceAll("grandsibling", "great aunt/uncle"),
    (str: string) =>
      str.replace(/sibling's (\d+(?:st|nd|rd|th) cousin)/g, "$1"),
  ];

  /**
   * Operations to strip out anything that shouldn't really be there.
   *
   * @example
   * "great  aunt/uncle" -> "great aunt/uncle"
   */
  private postOperations: Operation[] = [
    (p) => p.replaceAll(" 's", ""),
    (p) => p.replaceAll("  ", " "),
    (p) => (p.startsWith("'s") ? p.slice(2) : p),
    (p) => p.trim(),
  ];

  private cousinMatcher = /(?:parent's)(?: (?:parent|child)(?:'s)?)+ child/g;

  /**
   * Gets the full cousin string based on the matched relationship pattern.
   */
  private getCousinString(match: RegExpMatchArray): string {
    const matchedString = match[0];
    let parentCount = (matchedString.match(/parent/g) || []).length;
    let childCount = (matchedString.match(/child/g) || []).length;

    if (parentCount < 2) {
      // Handles cases like nieces, children, siblings
      return matchedString;
    }

    if (childCount === 1) {
      // Handles aunt/uncle relationships
      return parentCount <= 2
        ? "aunt/uncle"
        : `${"great ".repeat(parentCount - 3)}grand aunt/uncle`;
    }

    parentCount -= 2;
    childCount -= 2;

    const cousinDegree = Math.min(childCount + 1, parentCount + 1); // nth cousin
    const timesRemoved = Math.abs(parentCount - childCount); // times removed

    if (cousinDegree < 1) {
      return matchedString;
    }

    if (cousinDegree === 1 && timesRemoved === 0) {
      return "cousin";
    }

    let cousinLabel = `${cousinDegree}${this.getOrdinalSuffix(cousinDegree)} cousin`;

    if (timesRemoved > 0) {
      cousinLabel += ` ${timesRemoved === 1 ? "1 time" : `${timesRemoved} times`} removed`;
    }

    return cousinLabel.trim();
  }

  /**
   * Returns the ordinal suffix for a given number.
   */
  private getOrdinalSuffix(num: number): string {
    if (num % 10 === 1 && num !== 11) return "st";
    if (num % 10 === 2 && num !== 12) return "nd";
    if (num % 10 === 3 && num !== 13) return "rd";
    return "th";
  }
}
