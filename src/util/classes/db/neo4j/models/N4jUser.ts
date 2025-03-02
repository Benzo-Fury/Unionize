import { type Context, Service } from "@sern/handler";
import { N4jDataInterpreter } from "../base/N4jDataInterpreter";
import { N4jGuild } from "./N4jGuild";
import type { LocalRelation } from "./N4jRelation";

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
  public readonly guild: N4jGuild;

  constructor(
    public readonly id: string,
    guild: N4jGuild | string,
    private dataInterpreter: N4jDataInterpreter,
    public readonly elementId?: string,
  ) {
    // Convert into instance if not already
    this.guild = typeof guild === "string" ? new N4jGuild(guild) : guild;
  }

  /**
   * Creates a N4jUser from a command ctx.
   */
  public static fromCtx(ctx: Context) {
    const n4j = Service("N4jDataInterpreter");

    if (!ctx.guild) {
      throw new Error("Guild is not defined.");
    }

    return new N4jUser(ctx.user.id, ctx.guild.id, n4j);
  }

  public async marry(partner: N4jUser | string) {
    partner = this.userParameter(partner);

    await this.newRelation("PARTNER_OF", partner);
  }

  public async addParent(parent: N4jUser | string) {
    parent = this.userParameter(parent);

    return this.newRelation("PARENT_OF", parent);
  }

  public async adopt(child: N4jUser | string) {
    child = this.userParameter(child);

    return this.newRelation("CHILD_OF", child);
  }

  public async divorce(partner: N4jUser | string) {
    // Require "partner" parameter as multiple partners can exist
    partner = this.userParameter(partner);

    return this.remRelation("PARTNER_OF", partner);
  }

  public async emancipate(parent: N4jUser | string) {
    parent = this.userParameter(parent);

    return this.remRelation("PARENT_OF", parent);
  }

  public async disown() {}

  public toString() {
    return `<@${this.id}>`;
  }

  // --------------- Helpers --------------- //

  private newRelation(relation: LocalRelation, uId: string) {
    return this.dataInterpreter.createRelation(
      {
        relation: relation,
        user1Id: this.id,
        user2Id: uId,
        properties: {},
      },
      this.guild.id,
    );
  }
  private remRelation(relation: LocalRelation, uId: string) {
    return this.dataInterpreter.deleteRelation(
      {
        relation: relation,
        user1Id: this.id,
        user2Id: uId,
      },
      this.guild.id,
    );
  }

  /**
   * Essentially validates a user parameter.
   */
  private userParameter(u: N4jUser | string) {
    if (u instanceof N4jUser) return u.id;
    else return u;
  }
}
