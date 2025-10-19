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
  public records: Array<
    Partial<
      Record<CypherIdentifier | CIType, ModelMap[CIType] | ModelMap[CIType][]>
    >
  > = [];
  public unknownRecords = new Map<string, unknown>();
  public readonly summary: ResultSummary<Integer>;

  constructor(public readonly raw: QueryResult) {
    this.summary = raw.summary;
  }

  /**
   * Get all models of a specific type across all records, with type safety
   * Handles both single models and arrays of models
   */
  public get<T extends CIType>(k: CypherIdentifier<T> | T): ModelMap[T][] {
    const results: ModelMap[T][] = [];

    for (const record of this.records) {
      const value = record[k];
      if (value !== undefined) {
        if (Array.isArray(value)) {
          results.push(...(value as ModelMap[T][]));
        } else {
          results.push(value as ModelMap[T]);
        }
      }
    }

    return results;
  }

  /**
   * Get the first model of a specific type, throwing if none found
   */
  public getFirst<T extends CIType>(k: CypherIdentifier<T>): ModelMap[T] {
    const models = this.get(k);
    if (models.length === 0) {
      throw new ExecutorError(
        `Required model of type ${k} not found in execution results`,
      );
    }
    return models[0];
  }

  /**
   * Check if execution has a specific model type
   */
  public has(k: CypherIdentifier): boolean {
    return this.records.some((record) => record[k] !== undefined);
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
        const record: Partial<
          Record<
            CypherIdentifier | CIType,
            ModelMap[CIType] | ModelMap[CIType][]
          >
        > = {};

        // Loop each key on the record and convert to model
        for (let key of rec.keys) {
          if (typeof key !== "string") {
            key = key.toString();
          }

          const value: Value = rec.get(key);

          if (this.isCIType(key)) {
            record[key] = this.fieldToModel(key, value, rec);
          } else {
            execution.unknownRecords.set(key.toString(), value);
          }
        }

        execution.records.push(
          record as Partial<
            Record<
              CypherIdentifier | CIType,
              ModelMap[CIType] | ModelMap[CIType][]
            >
          >,
        );
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
    const model = execution.getFirst(key);

    return model;
  }

  /**
   * Converts a field value to its corresponding model or array of models
   */
  private fieldToModel<T extends CIType>(
    key: CypherIdentifier<T>,
    val: Value,
    record: N4jRecord<
      RecordShape,
      PropertyKey,
      RecordShape<PropertyKey, number>
    >,
  ): Model<T> | Model<T>[] {
    /**
     * Check if value is an array and handle it appropriately
     */
    function isArray(value: any): value is any[] {
      return Array.isArray(value);
    }

    const type = key[0] as CIType;
    try {
      // Handle arrays of models
      if (isArray(val)) {
        return val.map((item) => {
          // Type check each item before processing
          if (!this.isValidValue(item)) {
            throw new ExecutorError(
              `Invalid array item type: expected Node, Relationship, or Path but got ${item?.constructor?.name || typeof item}`,
            );
          }
          return this.convertSingleValue(type, item, record);
        }) as Model<T>[];
      }

      // Handle single values
      if (!this.isValidValue(val)) {
        const actualType = typeof val;
        throw new ExecutorError(
          `Invalid value type: expected Node, Relationship, or Path but got ${actualType}`,
        );
      }

      return this.convertSingleValue(type, val as Value, record) as Model<T>;
    } catch (error) {
      throw new ExecutorError(`Failed to convert field ${key} to model`, error);
    }
  }

  /**
   * Converts a single value to its corresponding model
   */
  private convertSingleValue<T extends CIType>(
    type: CIType,
    val: Value,
    record: N4jRecord<
      RecordShape,
      PropertyKey,
      RecordShape<PropertyKey, number>
    >,
  ): Model<T> {
    switch (type) {
      case "u": {
        if (!(val instanceof Node)) {
          throw new ExecutorError(
            `Incorrect field type: expected Node but got ${val.constructor.name}`,
          );
        }

        // Check for guild
        let g;
        if (record.has("g")) {
          g = record.get("g");
        }

        return new N4jUser(
          val.properties.id,
          g?.properties?.id,
          undefined,
          val.elementId,
        ) as Model<T>;
      }
      case "g": {
        if (!(val instanceof Node)) {
          throw new ExecutorError(
            `Incorrect field type: expected Node but got ${val.constructor.name}`,
          );
        }

        return new N4jGuild(
          val.properties.id,
          val.properties.createdOn,
        ) as Model<T>;
      }
      case "p": {
        if (!(val instanceof Path)) {
          throw new ExecutorError(
            `Incorrect field type: expected Path but got ${val.constructor.name}`,
          );
        }

        return N4jPath.fromRaw(val) as Model<T>;
      }
      case "r": {
        if (!(val instanceof Relationship)) {
          throw new ExecutorError(
            `Incorrect field type: expected Relationship but got ${val.constructor.name}`,
          );
        }

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
  }

  /**
   * Validates that a value is of the expected Neo4j types
   */
  private isValidValue(value: any): value is Value {
    return (
      value instanceof Node ||
      value instanceof Relationship ||
      value instanceof Path
    );
  }

  /**
   * Checks if a field key is a CIType.
   */
  private isCIType(key: string): key is CypherIdentifier {
    const CI_KEYS: CIType[] = ["u", "g", "r", "p"];
    return CI_KEYS.some((k) => key.startsWith(k));
  }
}
