import lang from "#lang";
import type { Client, EmbedData } from "discord.js";
import { EmojiManager } from "./EmojiManager";

/**
 * Finds the deepest key in a object that doesn't contain "type"
 */
type ResponseKeys<T> = {
  [K in Extract<keyof T, string>]: T[K] extends { type: string }
    ? `${K}` // If the object includes "type", this is a final response key
    : T[K] extends object
      ? `${K}.${ResponseKeys<T[K]>}` // Recursively process nested objects
      : never;
}[Extract<keyof T, string>];

/**
 * Represents the language file.
 */
export type LangType = typeof lang;

/**
 * The key of a response
 */
export type ResponseKey = ResponseKeys<LangType>;

/**
 * Parameters that are automatically replaced.
 */
export interface Parameters {
  [key: string]: string | number;
}

/**
 * A resolver used to pass text into lang responses
 */
export type Resolver = (args: string[]) => string | undefined;

/**
 * All types of responses
 */
export type ResponseTypes = "text" | "random_text" | "embed";

/**
 * Represents a response fetched from the lang
 */
export interface ResponseObj<T extends ResponseTypes> {
  type: T;
}
export interface TextResponseObj extends ResponseObj<"text"> {
  content: string;
}
export interface RandomTextResponseObj extends ResponseObj<"random_text"> {
  content: string[];
}
export interface EmbedResponseObj extends ResponseObj<"embed"> {
  embed: EmbedData;
}
/**
 * Union type for the response objs
 */
export type Response =
  | TextResponseObj
  | EmbedResponseObj
  | RandomTextResponseObj;

/**
 * LangManager is responsible for managing and fetching localized responses
 * from a predefined language file.
 * It supports text and embed responses.
 * It replaces any resolvable items in text such as {emoji.name}.
 */
export class LangManager {
  private resolvers: Record<string, Resolver> = {
    emoji: (args) =>
      this.emojiManager.getEmojiByKey(args[0]) || `{unfound.emoji}`,
    command: (args) => {
      const cmd = this.client.application?.commands.cache.find(
        (c) => c.name === args[0],
      );

      if (cmd) {
        return `</${cmd.name}:${cmd.id}>`;
      } else return "{unfound.command}";
    },
  };

  constructor(
    private lang: LangType,
    private client: Client,
    private emojiManager = new EmojiManager(),
  ) {}

  public getResponse<T extends ResponseTypes>(
    key: ResponseKey,
    parameters?: Parameters,
  ): T extends "text"
    ? TextResponseObj
    : T extends "random_text"
      ? RandomTextResponseObj
      : EmbedResponseObj {
    let response = this.retrieveResponse(key);

    // Replacing any parameters
    this.replaceParameters(response, { _key: key, ...parameters });

    // Applying formatting
    this.formatNumbers(response);

    return response as any;
  }

  // ---------------- Static ---------------- //

  /**
   * Validates a string that should the lang type.
   */
  public static validateLang(lang: LangType) {
    return this.validateObject(lang);
  }

  // --------------- Helpers ---------------- //

  // -------- Management ------- //

  private retrieveResponse(key: ResponseKey): Response {
    const parts = key.split("."); // Split the key into parts
    let response: any = this.lang;

    for (const part of parts) {
      if (response && part in response) {
        response = response[part];
      } else {
        // If a part is invalid, return a default response
        response = this.lang.errors.response_not_found;
      }
    }

    return structuredClone(response) as Response; // Return a copy to avoid mutating the original
  }

  // -------- Formatting ------- //

  private formatNumbers(res: Response) {
    // Traverse and apply number formatting to strings in response
    this.traverseAndApply(res, (value: string) =>
      // Formats numbers and ignores anything inside <>.
      value.replace(/\d+(?![^<]*>)/g, (num) => Number(num).toLocaleString()),
    );
  }

  private replaceParameters(res: Response, parameters?: Parameters) {
    const mergedParameters = { ...parameters };

    const replace = (text: string): string =>
      text.replace(/\{(\w+(\.\w+)*)\}/g, (_, path) => {
        const [prefix, ...args] = path.split(".");

        // Check if there is a resolver for the prefix (e.g., emoji, command)
        const resolver = this.resolvers[prefix];
        if (resolver) {
          const resolved = resolver(args);
          return resolved !== undefined ? resolved : `{${path}}`;
        }

        // General parameter lookup if no resolver matches
        const value = path
          .split(".")
          .reduce((acc: any, key: string) => acc && acc[key], mergedParameters);
        return value !== undefined ? value.toString() : `{${path}}`;
      });

    this.traverseAndApply(res, replace);
  }

  // -------- Validator -------- //

  private static validateObject(obj: Object, path = "") {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // If it's a nested object, recurse into it
      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        value !== null
      ) {
        if (value.type) {
          this.validateRes(value, currentPath);
        } else {
          this.validateObject(value, currentPath); // Recurse if it’s a nested object
        }
      } else {
        throw new Error(`Unexpected structure at ${currentPath}`);
      }
    }
  }

  private static validateRes(res: Object, path: string) {
    // Ensuring type is defined (should be if this method is being called)
    if (!("type" in res)) {
      throw new Error(`Missing type in message at ${path}`);
    }

    // Validating fields
    switch (res.type) {
      case "text": {
        if (!("content" in res)) {
          throw new Error(`Missing content for text message at ${path}`);
        }
        break;
      }
      case "embed": {
        // Description is only required field
        if (!("description" in res)) {
          throw new Error(
            `Embed message at ${path} is missing title or description`,
          );
        }
        break;
      }
    }
  }

  // ---------- Other ---------- //

  private traverseAndApply(obj: any, callback: (value: string) => string) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        obj[key] = callback(value);
      } else if (typeof value === "object" && value !== null) {
        this.traverseAndApply(value, callback);
      }
    }
  }
}
