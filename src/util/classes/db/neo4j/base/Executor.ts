import {
  Integer,
  Record as N4jRecord,
  Node,
  Path,
  type QueryResult,
  type RecordShape,
  Relationship,
  ResultSummary,
} from "neo4j-driver";
import type { Infer } from "ts/types/Infer";
import { N4jGuild } from "../models/N4jGuild";
import { N4jPath } from "../models/N4jPath";
import { N4jRelation } from "../models/N4jRelation";
import { N4jUser } from "../models/N4jUser";
import { N4jClient } from "./N4jClient";
import { type CIType, type CypherIdentifier, Query } from "./QueryBuilder";

/**
 * Custom error class for Neo4j execution errors
 */
export class ExecutorError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ExecutorError";
  }
}

/**
 * Represents a known value type returned from a Neo4j query.
 * Can be one of:
 * - Node: A vertex in the graph containing properties
 * - Path: A sequence of nodes connected by relationships
 * - Relationship: An edge between two nodes with a type and properties
 */
export type Value = Node | Path | Relationship;

export interface ModelMap {
  u: N4jUser;
  g: N4jGuild;
  r: N4jRelation;
  p: N4jPath;
}

export type Model<T extends CIType = CIType> = ModelMap[T];

/**
 * A completed query execution returned by the executor.
 * Contains modelled n4j records.
 */
export class Execution {
  public records = new Map<CypherIdentifier, Model>();
  public unknownRecords = new Map<string, unknown>();
  public readonly summary: ResultSummary<Integer>;

  constructor(public readonly raw: QueryResult) {
    this.summary = raw.summary;
  }

  /**
   * Get a specific model by its type, with type safety
   */
  public get<T extends CIType>(
    k: CypherIdentifier<T>,
  ): ModelMap[T] | undefined {
    return this.records.get(k) as ModelMap[T] | undefined;
  }

  /**
   * Get a specific model by its type, throwing if not found
   */
  public getOrThrow<T extends CIType>(k: CypherIdentifier<T>): ModelMap[T] {
    const model = this.get(k);
    if (!model) {
      throw new ExecutorError(
        `Required model of type ${k} not found in execution results`,
      );
    }
    return model;
  }

  /**
   * Check if execution has a specific model type
   */
  public has(k: CypherIdentifier): boolean {
    return this.records.has(k);
  }
}

/**
 * Executes queries against the Neo4j database using the {@link N4jClient}.
 * Provides an enhanced interface over the raw client with features like:
 *
 * - Automatic conversion of query results to typed models
 * - Type-safe access to models
 * - Built-in error handling
 * - Convenience methods for common operations
 *
 * This abstraction layer helps ensure consistent, safe and efficient database operations
 * while reducing boilerplate code in the application logic.
 */
export class Executor {
  constructor(public readonly client: N4jClient) {}

  /**
   * Runs a query with {@link N4jClient}.
   * @throws {ExecutorError} If the query execution fails
   */
  public async run(
    query: string | Query,
    parameters?: Record<string, Model | any>,
  ): Promise<Execution> {
    try {
      if (query instanceof Query) {
        query = query.toString();
      }

      // Input validation
      if (!query?.trim()) {
        throw new Error("Query string cannot be empty");
      }

      const raw = await this.client.run(query, parameters);

      // Convert res to an execution object
      const execution = new Execution(raw);

      // Loop raw records
      for (const rec of raw.records) {
        // Loop each key on the record and convert to model
        for (let key of rec.keys) {
          if (typeof key !== "string") {
            key = key.toString();
          }

          const value: Value = rec.get(key);

          if (this.isCIType(key)) {
            execution.records.set(key, this.fieldToModel(key, value, rec));
          } else {
            execution.unknownRecords.set(key.toString(), value);
          }
        }
      }

      return execution;
    } catch (error) {
      throw new ExecutorError("Failed to execute Neo4j query", error);
    }
  }

  /**
   * Runs a query and returns a single model of the specified type.
   * Useful when you expect exactly one result.
   * @throws {ExecutorError} If the model is not found or multiple models exist
   */
  public async runAndGetOne<T extends CIType>(
    key: CypherIdentifier<T>,
    query: string,
    parameters?: Record<string, Model | any>,
  ): Promise<ModelMap[T]> {
    const execution = await this.run(query, parameters);
    const model = execution.get(key);

    if (!model) {
      throw new ExecutorError(`No "${key}" model found in query results`);
    }

    return model;
  }

  /**
   * Converts a field value to its corresponding model
   */
  private fieldToModel<T extends CIType>(
    key: CypherIdentifier<T>,
    val: Value,
    record: N4jRecord<
      RecordShape,
      PropertyKey,
      RecordShape<PropertyKey, number>
    >,
  ): Model<T> {
    /**
     * Assert that value is value type.
     */
    function assert<T extends Value>(
      val: Value,
      t: new (...args: any[]) => T,
    ): asserts val is T {
      if (!(val instanceof t)) {
        /**
         * Cypher code likely returned something that wasn't expected for that key.
         */
        throw new ExecutorError(
          `Incorrect field type: expected ${t.name} but got ${val.constructor.name}`,
        );
      }
    }

    const type = key[0] as CIType;
    try {
      switch (type) {
        case "u": {
          assert(val, Node);

          // Check for guild
          let g = record.get("g");

          return new N4jUser(
            val.properties.id,
            g?.properties?.id ?? undefined,
            undefined,
            val.elementId,
          ) as Model<T>;
        }
        case "g": {
          assert(val, Node);

          return new N4jGuild(
            val.properties.id,
            val.properties.createdOn,
          ) as Model<T>;
        }
        case "p": {
          assert(val, Path);

          return N4jPath.fromRaw(val) as Model<T>;
        }
        case "r": {
          assert(val, Relationship);

          if (!N4jRelation.isValidRel(val.type)) {
            throw new Error(`Invalid relation type: ${val.type}`);
          }

          return new N4jRelation(
            val.type as any,
            val.startNodeElementId,
            val.endNodeElementId,
          ) as Model<T>;
        }
        default: {
          throw new Error("Unknown field key.");
        }
      }
    } catch (error) {
      throw new ExecutorError(`Failed to convert field ${key} to model`, error);
    }
  }

  /**
   * Checks if a field key is a CIType.
   */
  private isCIType(key: string): key is CypherIdentifier {
    const CI_KEYS: CIType[] = ["u", "g", "r", "p"];
    return CI_KEYS.some((k) => key.startsWith(k)); 
  }
}
