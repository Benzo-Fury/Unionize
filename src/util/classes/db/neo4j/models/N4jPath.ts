import type { Path } from "neo4j-driver";
import type { RelationType } from "./N4jRelation";

/**
 * Represents a segment in a relationship path between users.
 */
export type PathItem =
  | `${"parent" | "child" | "partner" | "unknown_rel"}${"" | "'s"}`;

/**
 * A database path returned from the database.
 *
 * @example
 * const dbPath: DatabasePath = ["parent's" "parent's" "parent"]; 
 */
export type DatabasePath = PathItem[];

/**
 * Represents a relationship path between 2 users.
 */
export class N4jPath extends Array<PathItem> {
  /**
   * Creates a N4jPath from a raw N4j path.
   */
  public static fromRaw(raw: Path): N4jPath {
    let p = new N4jPath();

    for (const seg of raw.segments) {
      const rel = seg.relationship;
      const forward = rel.start.equals(seg.start.identity);

      switch (rel.type as RelationType) {
        case "PARENT_OF": {
          p.push(forward ? "parent's" : "child's");
          break;
        }
        case "PARTNER_OF": {
          p.push("partner's");
          break;
        }
        default: {
          p.push("unknown_rel's");
        }
      }
    }

    // Strip trailing "'s" from last item
    if (p.length > 0) {
      const lastItem = p[p.length - 1];
      if (lastItem.endsWith("'s")) {
        p[p.length - 1] = lastItem.slice(0, -2) as PathItem;
      }
    }

    return p;
  }

  public toString() {
    return this.join(" ");
  }
}
