import type { DBRelation } from "../models/N4jRelation";

/**
 * The type of a cypher identifier used in Neo4j queries.
 */
export type CIType = "u" | "g" | "r";

/**
 * A identifier for Neo4j objects in cypher queries.
 * Format: {type}_{number} where type is one of CIType
 *
 * @example
 * function createNode(id: string) {
 *   const nodeId: CypherIdentifier = "u_1"; // User node with ID 1
 *
 *   const query = new Query();
 *   query.manual(`MATCH (${nodeId}:Node { id: id })`)
 * }
 */
export type CypherIdentifier<T extends CIType = CIType> = `${T}_${number}`;

/**
 * Options for query execution
 */
export interface QueryOptions {
  /**
   * Whether to validate IDs before executing queries
   * @default true
   */
  validateIds?: boolean;

  /**
   * Whether to add timestamps to created nodes/relationships
   * @default true
   */
  addTimestamps?: boolean;
}

/**
 * A builder class for constructing Neo4j Cypher queries dynamically.
 * Provides methods for common operations like creating/merging nodes and relationships.
 * Can be used with the N4jClient to execute these queries.
 *
 * @example
 * const query = new Query();
 *
 * // Create two users and connect them
 * const user1 = query.mergeUser(user1Id);
 * const user2 = query.mergeUser(user2Id);
 *
 * const rel = query.createRel(user1, user2);
 *
 * const client = resolve("N4jClient");
 * client.execute(query);
 */
export class Query {
  /**
   * The accumulated Cypher query string built up through method calls.
   * Each method appends its corresponding Cypher statements to this string.
   */
  private execution = "";

  private _counter = 0;

  /**
   * Query execution options
   */
  private options: Required<QueryOptions>;

  constructor(options: QueryOptions = {}) {
    this.options = {
      validateIds: options.validateIds ?? true,
      addTimestamps: options.addTimestamps ?? true,
    };
  }

  /**
   * Auto-incrementing counter used to generate unique identifiers for nodes and relationships.
   * Each call to counter increments the value by 1.
   */
  get counter() {
    this._counter++;
    return this._counter;
  }

  /**
   * Creates or finds a user node in the database and connects it to a guild.
   * If the user doesn't exist, it will be created with a timestamp.
   *
   * @param id - The unique identifier of the user
   * @param guildCI - The cypher identifier of the guild to connect the user to
   * @returns A cypher identifier for the user node
   * @throws {Error} If id is invalid and validation is enabled
   *
   * @example
   * const query = new Query();
   * const guild = query.mergeGuild("guild123");
   * const user = query.mergeUser("user456", guild);
   */
  public mergeUser(
    id: string,
    guildCI: CypherIdentifier,
  ): CypherIdentifier<"u"> {
    if (this.options.validateIds && !this.isValidId(id)) {
      throw new Error(`Invalid user ID: ${id}`);
    }

    const ci = this.createCI("u");
    const timestamp = this.options.addTimestamps
      ? `ON CREATE SET ${ci}.createdOn = timestamp()`
      : "";

    this.appendQuery(
      [guildCI],
      `
        MERGE (${ci}:User { id: ${id} })-[:MEMBER_OF]->(${guildCI})
        ${timestamp}
      `,
    );

    return ci;
  }

  /**
   * Creates or finds a guild node in the database.
   * If the guild doesn't exist, it will be created with a timestamp.
   *
   * @param id - The unique identifier of the guild
   * @returns A cypher identifier for the guild node
   * @throws {Error} If id is invalid and validation is enabled
   *
   * @example
   * const query = new Query();
   * const guild = query.mergeGuild("guild123");
   */
  public mergeGuild(id: string): CypherIdentifier<"g"> {
    if (this.options.validateIds && !this.isValidId(id)) {
      throw new Error(`Invalid guild ID: ${id}`);
    }

    const ci = this.createCI("g");
    const timestamp = this.options.addTimestamps
      ? `ON CREATE SET ${ci}.createdOn = timestamp()`
      : "";

    this.appendQuery(
      [],
      `
        MERGE (${ci}:Guild { id: ${id} })
        ${timestamp}
      `,
    );

    return ci;
  }

  /**
   * Creates a relationship between two user nodes.
   *
   * @param u1 - Cypher identifier of the source user node
   * @param r - The type of relationship to create
   * @param u2 - Cypher identifier of the target user node
   * @returns The cypher identifier for the created relationship
   */
  public createRel(
    u1: CypherIdentifier<"u">,
    r: DBRelation,
    u2: CypherIdentifier<"u">,
  ): CypherIdentifier<"r"> {
    const ci = this.createCI("r");
    const timestamp = this.options.addTimestamps
      ? `ON CREATE SET ${ci}.createdOn = timestamp()`
      : "";

    this.appendQuery(
      [u1, u2],
      `
        MERGE (${u1})-[${ci}:${r}]->(${u2})
        ${timestamp}
      `,
    );

    return ci;
  }

  /**
   * Sets properties on a node or relationship.
   *
   * @param identifier - The cypher identifier of the node/relationship
   * @param properties - Object containing the properties to set
   * @example
   * const query = new Query();
   * const user = query.matchUser("user123");
   * query.setProperties(user, { name: "John", age: 25 });
   */
  public setProperties(ci: CypherIdentifier, properties: Record<string, any>) {
    const props = Object.entries(properties)
      .map(([key, value]) => {
        const valueStr = typeof value === "string" ? `"${value}"` : value;
        return `${ci}.${key} = ${valueStr}`;
      })
      .join(", ");

    this.appendQuery(
      [ci],
      `
        SET ${props}
      `,
    );
  }

  /**
   * Adds WHERE clause conditions to the query.
   *
   * @param conditions - Array of condition strings
   * @example
   * const query = new Query();
   * const user = query.matchUser("user123");
   * query.where([
   *   `${user}.age > 18`,
   *   `${user}.status = "active"`
   * ]);
   */
  public where(conditions: string[]) {
    this.appendQuery(
      [],
      `
        WHERE ${conditions.join(" AND ")}
      `,
    );
  }

  /**
   * Deletes a node and all its relationships from the database.
   *
   * @param n - Cypher identifier of the node to delete (user or guild)
   */
  public delete(n: CypherIdentifier<"u" | "g">) {
    this.appendQuery(
      [n],
      `
        DETACH DELETE (${n})
      `,
    );
  }

  /**
   * Adds a custom Cypher query statement.
   * Use this method to add complex queries that aren't covered by the built-in methods.
   *
   * @param statement - The Cypher query statement to add
   */
  public manual(statement: string) {
    this.appendQuery([], statement);
  }

  /**
   * Returns specified properties from matched nodes/relationships.
   *
   * @param returns - Array of return expressions
   * @example
   * const query = new Query();
   * const user = query.matchUser("user123");
   * query.return([
   *   `${user}.name`,
   *   `${user}.age`
   * ]);
   */
  public return(returns: string[]) {
    this.appendQuery(
      [],
      `
        RETURN ${returns.join(", ")}
      `,
    );
  }

  /**
   * Returns the complete Cypher query string built by this Query instance.
   *
   * @returns The constructed Cypher query string
   */
  public toString() {
    return this.execution.trim();
  }

  /**
   * Clears the current query, resetting it to an empty state.
   */
  public clear() {
    this.execution = "";
    this._counter = 0;
  }

  // Helper Methods

  /**
   * Appends a query to the execution string with proper WITH statement and formatting.
   * @param carryVariables - Array of variables to carry forward in the WITH statement
   * @param query - The query string to append
   */
  private appendQuery(carryVariables: CypherIdentifier[], query: string) {
    // Add WITH clause if we have variables to carry forward
    if (carryVariables.length > 0) {
      this.execution += `\nWITH ${carryVariables.join(", ")}\n`;
    }

    // Add the query with consistent formatting
    this.execution += query.trim() + "\n";
  }

  /**
   * Creates a unique cypher identifier for a node or relationship.
   *
   * @param type - The type of identifier to create (u: user, g: guild, r: relationship)
   * @returns A unique cypher identifier
   */
  private createCI<T extends CIType>(type: T): CypherIdentifier<T> {
    return `${type}_${this.counter}` as CypherIdentifier<T>;
  }

  /**
   * Validates if the provided ID is in the correct format.
   * Override this method to implement custom ID validation logic.
   *
   * @param id - The ID to validate
   * @returns Whether the ID is valid
   */
  protected isValidId(id: string): boolean {
    return id != null && id.trim().length > 0;
  }
}
