import type { N4jUser } from "./N4jUser";

/**
 * Enum of all direct relationships that the db understands.
 */
export enum DirectRelation {
  Child = "CHILD_PF", // Wont be returned from db unless in a path
  Parent = "PARENT_OF",
  Partner = "PARTNER_OF",
}

/**
 * A relation that only has its type defined.
 *
 * This can be used by commands and other classes to pass to methods as an object rather than -
 * creating a new N4jUser instance.
 */
export interface N4jSnowflakeRelation {
  user1Id: string;
  user2Id: string;
  relation: DirectRelation;
  properties?: Record<string, any>;
}

/**
 * Represents a relation that exists in the Neo4j database.
 */
export class N4jRelation {
  constructor(
    public readonly type: DirectRelation,
    public readonly primaryNode: N4jUser | string,
    public readonly secondaryNode: N4jUser | string,
  ) {}
}
