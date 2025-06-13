import type { N4jUser } from "./N4jUser";

/**
 * A relationship that can be used locally by Javascript
 * @deprecated Use {@link RelationType}
 */
export type LocalRelation = "CHILD_OF" | "PARENT_OF" | "PARTNER_OF";

/**
 * A relationship that can be used by the database.
 * The database does not understand "CHILD_OF"... see: https://dzone.com/articles/modelling-data-neo4j
 * @deprecated Use {@link RelationType}
 */
export type DBRelation = Exclude<LocalRelation, "CHILD_OF">;

export type RelationType = "PARENT_OF" | "PARTNER_OF";

/**
 * A relation that only has its type defined.
 *
 * This can be used by commands and other classes to pass to methods as an object rather than -
 * creating a new N4jUser instance.
 */
export interface N4jSnowflakeRelation {
  user1Id: string;
  user2Id: string;
  relation: LocalRelation;
  properties: Record<string, any>;
}

/**
 * Represents a relation that exists in the Neo4j database.
 */
export class N4jRelation {
  constructor(
    public readonly type: LocalRelation,
    public readonly primaryNode: N4jUser | string,
    public readonly secondaryNode: N4jUser | string,
  ) {}

  public static isValidRel(val: string) {
    const validRels: RelationType[] = ["PARENT_OF", "PARTNER_OF"];

    return validRels.includes(val as RelationType);
  }
}
