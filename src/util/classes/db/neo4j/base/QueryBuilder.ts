import config from "#config";
import type { DBRelation, LocalRelation } from "../models/N4jRelation";

/**
 * The type of a cypher identifier used in Neo4j queries.
 */
export type CIType = "u" | "g" | "r" | "p";

/**
 * A identifier for Neo4j objects in cypher queries.
 * Format: {type}_{number} where type is one of CIType, or "*" for wildcard matches
 *
 * @example
 * function createNode(id: string) {
 *   const nodeId: CypherIdentifier = "u_1"; // User node with ID 1
 *
 *   const query = new Query();
 *   query.manual(`MATCH (${nodeId}:Node { id: id })`)
 * }
 */
export type CypherIdentifier<T extends CIType = CIType> =
  | `${T}_${number}`
  | "*";

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
   * Array of cypher identifiers that should be carried forward in every WITH statement
   * regardless of whether they are explicitly specified.
   */
  private persistentVariables: CypherIdentifier[] = [];

  /**
   * Query execution options
   */
  private options: Required<QueryOptions>;

  /**
   * Maps user cypher identifiers to their associated guild cypher identifiers
   */
  private userGuildMap: Map<CypherIdentifier<"u">, CypherIdentifier<"g">> =
    new Map();

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
   * Adds a cypher identifier to the list of variables that should be carried forward
   * in every WITH statement.
   * @param ci - The cypher identifier to persist
   */
  public addPersistentVariable(ci: CypherIdentifier) {
    if (!this.persistentVariables.includes(ci)) {
      this.persistentVariables.push(ci);
    }
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
    guildCI: CypherIdentifier<"g">,
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
        MERGE (${ci}:User { id: "${id}" })-[:MEMBER_OF]->(${guildCI})
        ${timestamp}
      `,
    );

    this.addPersistentVariable(ci);
    this.userGuildMap.set(ci, guildCI);

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
        MERGE (${ci}:Guild { id: "${id}" })
        ${timestamp}
      `,
    );

    this.addPersistentVariable(ci);

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
   * Matches an existing relationship between two user nodes.
   * If "*" is passed as either user identifier, it will create an anonymous node pattern.
   *
   * @param u1 - Cypher identifier of the source user node, or "*" for any user
   * @param r - The type of relationship to match
   * @param u2 - Cypher identifier of the target user node, or "*" for any user
   * @param directional - Whether the relationship is directional
   * @returns The cypher identifier for the matched relationship
   *
   * @example
   * const query = new Query();
   * // Match any user that is a parent of user456
   * const user2 = query.matchUser("user456");
   * const rel = query.matchRel("*", "PARENT_OF", user2);
   */
  public matchRel(
    u1: CypherIdentifier<"u">,
    r: DBRelation,
    u2: CypherIdentifier<"u">,
    directional = true,
  ): CypherIdentifier<"r"> {
    const ci = this.createCI("r");

    // Convert wildcards to anonymous patterns
    const node1 = u1 === "*" ? "(:User)" : `(${u1})`;
    const node2 = u2 === "*" ? "(:User)" : `(${u2})`;

    this.appendQuery(
      [u1, u2].filter((id) => id !== "*") as CypherIdentifier[],
      `
        MATCH ${node1}-[${ci}:${r}]-${directional ? ">" : ""}${node2}
      `,
    );

    return ci;
  }

  /**
   * Merges a user node that has a specific relationship with another node and is a member of a guild.
   * @param u1Id - The ID of the user to merge
   * @param guildCI - The cypher identifier of the guild node
   * @param r - The type of relationship the user should have
   * @param u2CI - The cypher identifier of the target node
   * @returns The cypher identifier for the merged user node
   */
  public matchUserWhereRel(
    guildCI: CypherIdentifier<"g">,
    r: DBRelation,
    u2CI: CypherIdentifier<"u">,
    reverse = false,
  ): CypherIdentifier<"u"> {
    const ci = this.createCI("u");

    this.appendQuery(
      [guildCI, u2CI],
      `
        MATCH (${ci})
        WHERE (${ci})-[:MEMBER_OF]->(${guildCI})
          AND (${reverse ? u2CI : ci})-[:${r}]->(${reverse ? ci : u2CI})
      `,
    );

    return ci;
  }

  /**
   * Gets the shortest path between two users through PARENT_OF and PARTNER_OF relationships.
   * Function currently contains its own return statement in cypher and will be a {@link LocalRelation}.
   * @param u1 - Starting user cypher identifier
   * @param u2 - Ending user cypher identifier
   */
  public matchPath(u1: CypherIdentifier<"u">, u2: CypherIdentifier<"u">) {
    const ci = this.createCI("p");

    this.appendQuery(
      [u1, u2],
      `
        MATCH ${ci} = shortestPath((${u1})-[:PARENT_OF|PARTNER_OF*]-(${u2}))
      `,
    );

    return ci;
  }

  /**
   * Matches an entire user's tree.
   * Defaults to 100 node jumps but can be changed
   */
  public matchTree(
    u: CypherIdentifier<"u">,
    maxJumps = config.database.maxTreeRecursiveDepth,
  ) {
    const uCI = this.createCI("u");
    const rCI = this.createCI("r");

    this.appendQuery(
      [u],
      `
        CALL apoc.path.subgraphAll(${u}, {
          relationshipFilter: "PARENT_OF|PARTNER_OF",
          maxLevel: ${maxJumps},
          uniqueness: "NODE_GLOBAL"
        }) YIELD nodes AS ${uCI}, relationships AS ${rCI}
      `,
    );

    return { users: uCI, relations: rCI };
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
  public delete(item: CypherIdentifier) {
    this.appendQuery(
      [item],
      `
        ${item.startsWith("r") ? "" : "DETACH"} DELETE (${item})
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
   * If any of the return expressions reference a user node that was merged with a guild,
   * the guild will be automatically included in the return statement if not already present.
   *
   * @param returns - Array of return expressions
   * @example
   * const query = new Query();
   * const user = query.matchUser("user123");
   * query.return([
   *   `${user}.name`,
   *   `${user}.age`
   * ]); // Will also return the associated guild if not already included
   */
  public return(returns: string[]) {
    // Find all user cypher identifiers in the return expressions
    const userCIs = returns
      .filter((r) => r.startsWith("u_"))
      .map((r) => r.split(".")[0] as CypherIdentifier<"u">);

    // Find all guild identifiers already in the return expressions
    const existingGuildCIs = new Set(
      returns.filter((r) => r.startsWith("g_")).map((r) => r.split(".")[0]),
    );

    // Add guild information for each user that has an associated guild,
    // but only if that guild isn't already being returned
    const guildReturns = userCIs
      .filter((ci) => this.userGuildMap.has(ci))
      .map((ci) => this.userGuildMap.get(ci)!)
      .filter((guild, index, self) => self.indexOf(guild) === index) // Deduplicate guilds
      .filter((guild) => !existingGuildCIs.has(guild)) // Filter out guilds already in returns
      .map((guild) => `${guild}`);

    const allReturns = [...returns, ...guildReturns];

    // Extract cypher identifiers from return expressions for the WITH clause
    const carryVariables = returns
      .map((r) => r.split(" AS ")[0].trim()) // Get the part before "AS"
      .filter((r) => /^[ugr]_/.test(r)) // Only include valid cypher identifiers
      .map((r) => r as CypherIdentifier);

    this.appendQuery(
      carryVariables,
      `
        RETURN ${allReturns.join(", ")}
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
    this.persistentVariables = [];
    this.userGuildMap.clear();
  }

  // Helper Methods

  /**
   * Appends a query to the execution string with proper WITH statement and formatting.
   * @param carryVariables - Array of variables to carry forward in the WITH statement
   * @param query - The query string to append
   */
  private appendQuery(carryVariables: CypherIdentifier[], query: string) {
    // Combine explicitly carried variables with persistent variables
    const allVariables = [
      ...new Set([...carryVariables, ...this.persistentVariables]),
    ];

    // Add WITH clause if we have variables to carry forward
    if (allVariables.length > 0) {
      this.execution += `\nWITH ${allVariables.join(", ")}\n`;
    }

    // Add the query with consistent formatting
    this.execution += query.trim() + "\n";
  }

  /**
   * Creates a unique cypher identifier for a node or relationship.
   * This is a public version of createCI that can be used by external classes.
   *
   * @param type - The type of identifier to create (u: user, g: guild, r: relationship)
   * @returns A unique cypher identifier
   */
  public createIdentifier<T extends CIType>(type: T): CypherIdentifier<T> {
    return this.createCI(type);
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
