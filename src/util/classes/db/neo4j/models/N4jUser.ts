import { N4jDataInterpreter } from "../base/N4jDataInterpreter";
import { N4jGuild } from "./N4jGuild";
import { DirectRelation } from "./N4jRelation";

/**
 * A user that only has an id and guild id.
 *
 * This can be used by commands and other classes to pass to methods as an object rather than -
 * creating a new N4jUser instance.
 */
export interface N4jSnowflakeUser {
  readonly id: string;
  readonly guildId: string;
}

export type AnyN4jUser = N4jSnowflakeUser | N4jUser;

/**
 * Represents a user that exists in the Neo4j database.
 */
export class N4jUser {
  public readonly guild: N4jGuild | null;

  constructor(
    public readonly id: string,
    guild: N4jGuild | string | null,
    private dataInterpreter: N4jDataInterpreter,
    public readonly elementId?: string,
  ) {
    // Convert into instance if not already
    this.guild = typeof guild === "string" ? new N4jGuild(guild) : guild;
  }

  /**
   * Creates partner relationships between you and another user.
   *
   * Internally calls the interpreter createRelation method
   */
  public async marry(user: N4jUser | string) {
    // Checking a guild exists
    if (!this.guild) {
      throw new Error(
        "Guild missing. Did you forget to supply a guild to marry against?",
      );
    }

    // Creating link
    await this.dataInterpreter.createRelation(
      {
        user1Id: this.id,
        user2Id: user instanceof N4jUser ? user.id : user,
        relation: DirectRelation.Partner,
      },
      this.guild.id,
    );
  }

  public addParent() {}
  public addChild() {}

  public toString() {
    return `<@${this.id}>`;
  }
}
