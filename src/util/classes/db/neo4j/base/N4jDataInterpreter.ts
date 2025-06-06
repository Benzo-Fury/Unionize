import config from "#config";
import type {
  ManagedTransaction,
  Node,
  RecordShape,
  Relationship,
} from "neo4j-driver";
import type { DatabasePath as DBRelationPath } from "../helpers/RelationSimplifier";
import { N4jGuild } from "../models/N4jGuild";
import {
  type DBRelation,
  type LocalRelation,
  N4jRelation,
  type N4jSnowflakeRelation,
} from "../models/N4jRelation";
import { type N4jSnowflakeUser, N4jUser } from "../models/N4jUser";
import { N4jClient } from "./N4jClient";
import { N4jError, N4jErrorCode } from "./N4jError";

/**
 * Names of different queries that are stored in the queries directory.
 */
export type Query =
  | "generateRelationPath"
  | "matchUser"
  | "matchRelation"
  | "matchUsers"
  | "matchTree"
  | "matchAllPartners"
  | "matchAllRelType"
  | "createRelation"
  | "createUser"
  | "createGuild"
  | "deleteRelation"
  | "deleteAllRelType";

export type QueryParameters = Record<string, any>;

/**
 * N4jDataInterpreter
 *
 * This class serves as the intermediary layer between the Neo4j client and higher-level application models.
 * It performs the following key functions:
 *
 * 1. **Query Execution**: Retrieves predefined Cypher queries and executes them through `Neo4jClient` to interact with the Neo4j database.
 *
 * 2. **Data Transformation**: Converts raw Neo4j records into models, such as `N4jUser` and `N4jGuild`, to
 *    provide application-friendly representations of database objects.
 *
 * 3. **Business Logic**: Contains methods tailored to specific application requirements (e.g., `createRelation` or `matchUser`).
 *    These methods handle operations that often involve multiple queries or complex Cypher, simplifying higher-level operations.
 *
 * ## Usage
 * This class acts as a middle layer, so higher-level application components interact only with `N4jDataInterpreter`,
 * which, in turn, interacts with `Neo4jClient` to execute queries.
 *
 * ## Example
 * ```typescript
 * const interpreter = new N4jDataInterpreter(client);
 * const user = await interpreter.matchUser("12345", "guild123");
 * ```
 *
 * This class abstracts away low-level Neo4j interactions, providing a streamlined interface for handling data and relationships.
 */
export class N4jDataInterpreter {
  constructor(
    /**
     * Reference to the Neo4j client
     */
    private client: N4jClient,
  ) {}

  // -------------- Core Methods -------------- //

  /**
   * Runs a query.
   * Internally calls the client run query method but provides additional functionality.
   */
  public async runQuery(query: string, parameters: Record<string, any> = {}) {
    try {
      // Executing query against client
      const res = await this.client.runQuery(query, parameters);

      // Checking if null
      if (res.records.length === 0) return null;

      // Returning whole result in driver format
      return res;
    } catch (e) {
      // Checking if error is generic
      const mappedError = this.mapNeo4jError(e);
      if (mappedError) {
        throw new N4jError(mappedError);
      } else {
        throw new Error("Undeclared Cypher Error: " + e);
      }
    }
  }

  /**
   * Runs a transaction.
   * Internally calls the client createTransaction method but provides additional functionality.
   */
  public async executeTransaction(
    transactionFunc: (t: ManagedTransaction) => any,
    transactionType: "write" | "read" = "write",
  ) {
    // Executing transaction
    const res = await this.client.createTransaction(
      transactionFunc,
      transactionType,
    );

    // Checking if nothing was returned
    if (!res || res.records.length === 0) return null;

    // Checking if record was returned
    if (res.records[0].has("errorCode")) {
      throw new Error(res.records[0].get("errorCode"));
    }

    return res;
  }

  /**
   * Fetches one of the pre-defined queries and returns it as a string.
   */
  private async getQuery(queryName: Query) {
    let query;

    try {
      query = await Bun.file(
        `${config.database.cypherScriptDirectory}/${queryName}.cql`,
      ).text();
    } catch (e) {
      throw new Error(`Error while importing cypher query: ${e}`);
    }

    return query;
  }

  // ------------- Handler Methods ------------- //

  /**
   * Creates a user in the database and links them to their guild.
   *
   * If the user or guild already exists, the function will update their relationship as needed.
   */
  public async createUser(data: N4jSnowflakeUser) {
    const { id, guildId } = data;

    // Running query
    const result = (await this.getAndRunQuery("createUser", {
      uid: id,
      gid: guildId,
    }))!;

    // Returning user created.
    return this.recordToUser(result, guildId);
  }

  /**
   * Creates a new guild in the db.
   * @warn Method will overwrite any existing guilds with the same id.
   */
  public async createGuild(id: string) {
    // Running query
    const result = (await this.getAndRunQuery("createGuild", { gid: id }))!;

    // Returning guild created
    return this.recordToGuild(result?.records[0]);
  }

  /**
   * Establishes a direct relationship between two users.
   * This method will upsert users AND guilds (meaning it will create the users/guild if they do not exist)
   */
  public async createRelation(data: N4jSnowflakeRelation, guildId: string) {
    let { user1Id, user2Id, relation } = data;

    if (relation === "CHILD_OF") {
      relation = "PARENT_OF";
      [user1Id, user2Id] = [user2Id, user1Id]; // Swapping the users
    }

    // Running query
    const result = (await this.getAndRunQuery("createRelation", {
      uid1: user1Id,
      uid2: user2Id,
      gid: guildId,
      r: relation,
      p: data.properties,
    }))!;

    // Extracting result
    return this.recordToRelation(result.records[0]);
  }

  /**
   * Deletes a relation between 2 user.
   *
   * @throws {error} - if users are NOT from same guild
   */
  public async deleteRelation(
    rel: Omit<N4jSnowflakeRelation, "properties">,
    guildId: string,
  ) {
    let { user1Id, user2Id, relation } = rel;

    if (relation === "CHILD_OF") {
      relation = "PARENT_OF";
      [user1Id, user2Id] = [user2Id, user1Id]; // Swapping the users
    }

    // Running query
    await this.getAndRunQuery("deleteRelation", {
      uid1: user1Id,
      uid2: user2Id,
      gid: guildId,
      r: relation,
    });

    // Return nothing - void method
  }

  /**
   * Deletes all relations of a certain type relative to a specified user.
   */
  public async deleteAll(userId: string, guildId: string, rel: LocalRelation) {
    let reverse = false;

    if (rel === "CHILD_OF") {
      rel = "PARENT_OF";
      reverse = true;
    }

    const res = await this.getAndRunQuery("deleteAllRelType", {
      gid: guildId,
      uid: userId,
      rT: rel,
      rev: reverse,
    });
  }

  /**
   * Takes 2 users and their guild and returns their relationship.
   */
  public async matchRelation(
    user1Id: string,
    user2Id: string,
    guildId: string,
  ) {
    // Running query
    const result = await this.getAndRunQuery("matchRelation", {
      uid1: user1Id,
      uid2: user2Id,
      gid: guildId,
    });

    if (!result) return null;

    // Returning relation
    return this.recordToRelation(result.records[0]);
  }

  /**
   * Takes an id and returns a user.
   */
  public async matchUser(id: string, guildId: string) {
    const result = await this.getAndRunQuery("matchUser", {
      uid: id,
      gid: guildId,
    });

    if (!result) return null;

    return this.recordToUser(result.records[0], guildId);
  }

  /**
   * Matches multiple users.
   */
  public async matchUsers(userIds: string[], guildId: string) {
    // Running query to match users
    const result = (await this.getAndRunQuery("matchUsers", {
      gid: guildId,
      uids: userIds,
    }))!;

    // Returning matched users
    return result.records.map((r) => this.recordToUser(r, guildId));
  }

  /**
   * Takes a user and matches their entire family tree.
   *
   * @param maxDepth - The maximum number of nodes the query can process
   */
  public async matchTree(
    user: N4jSnowflakeUser,
    maxDepth: number = config.database.maxTreeRecursiveDepth,
  ): Promise<{
    nodes: N4jUser[];
    relations: N4jRelation[];
  } | null> {
    const result = await this.getAndRunQuery("matchTree", {
      uid: user.id,
      gid: user.guildId,
      ml: maxDepth, //max length
    });

    if (!result) return null;

    return {
      nodes: result.records[0]
        .get("n")
        .map((n: Node) => this.nodeToUser(n, user.guildId)),
      relations: result.records[0]
        .get("r")
        .map((r: Relationship) => this.n4jRelationToLocalRelation(r)),
    };
  }

  public async generateRelationPath(
    user1Id: string,
    user2Id: string,
    guildId: string,
  ) {
    const result = await this.getAndRunQuery("generateRelationPath", {
      uid1: user1Id,
      uid2: user2Id,
      gid: guildId,
    });

    if (!result) {
      return null;
    }

    const path = result.records[0].get("p") as DBRelationPath;

    if (path.length === 0) {
      return null;
    }

    return path;
  }

  /**
   * Gets all of a certain relationship.
   * For example: getAll("Children")
   */
  public async getAll(userId: string, guildId: string, rel: LocalRelation) {
    let reverse = false;

    if (rel === "CHILD_OF") {
      rel = "PARENT_OF";
      reverse = true;
    }

    let result = await (rel === "PARTNER_OF"
      ? this.getAndRunQuery("matchAllPartners", {
          gid: guildId,
          uid: userId,
        })
      : this.getAndRunQuery("matchAllRelType", {
          gid: guildId,
          uid: userId,
          r: rel,
          rev: reverse,
        }));

    if (!result) return null;

    return result.records.map((r) => this.recordToUser(r, guildId));
  }

  // ---------- Helper Methods ---------- //

  /**
   * Wrapper function to clean up fetching the query in sub methods
   */
  public async getAndRunQuery(
    queryName: Query,
    parameters: QueryParameters = {},
  ) {
    // Getting query
    const query = await this.getQuery(queryName);

    // Running query
    return this.runQuery(query, parameters);
  }

  private mapNeo4jError(error: any): N4jErrorCode | null {
    if (error instanceof Error) {
      // Check if the error message contains any of the CypherErrorCode values
      for (const code of Object.values(N4jErrorCode)) {
        if (error.message.includes(code)) {
          return code as N4jErrorCode;
        }
      }
    }
    return null;
  }

  // -------- Transition Methods -------- //

  /**
   * Converts a Neo4j `Record` containing a `User` node (`u`) and a `Guild` node (`g`)
   * into an instance of `N4jUser` with the associated guild information.
   *
   * @throws {Error} if `record` does not contain the expected `u` and `g` fields.
   */
  private recordToUser(record: RecordShape, guild: N4jGuild | string) {
    // Extracting user
    const rUser: Node = record.get("u");
    const guildId = guild instanceof N4jGuild ? guild.id : guild;

    return new N4jUser(rUser.properties.id, guildId, this, rUser.elementId);
  }

  /**
   * Converts a Neo4j `Record` containing a `Guild` node (`g`)
   * into an instance of `N4jGuild`.
   *
   * @throws {Error} if `record` does not contain the expected `g` field.
   */
  private recordToGuild(record: RecordShape) {
    // Extracting guild
    const guild: Node = record.get("g");

    // Converting into class instance.
    return new N4jGuild(guild.properties.id, guild.properties.addedOn);
  }

  /**
   * Converts a Neo4j `Record` containing a `Relation` (`r`)
   * into an instance of `N4jRelation`.
   *
   * @throws {Error} if `record` does not contain the expected `r` field.
   */
  private recordToRelation(record: RecordShape) {
    // Extracting relation
    const relation: Relationship = record.get("r");

    // Converting into class instance.
    return new N4jRelation(
      relation.type as LocalRelation,
      relation.startNodeElementId,
      relation.endNodeElementId,
    );
  }

  /**
   * Converts a neo4j node instance to a user
   */
  private nodeToUser(node: Node, guildId: string) {
    return new N4jUser(node.properties.id, guildId, this, node.elementId);
  }

  private n4jRelationToLocalRelation(rel: Relationship) {
    return new N4jRelation(
      rel.type as LocalRelation,
      rel.startNodeElementId,
      rel.endNodeElementId,
    );
  }
}
