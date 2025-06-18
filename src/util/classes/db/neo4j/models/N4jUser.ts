import { type Context, Service } from "@sern/handler";
import { type Client, type Interaction, User } from "discord.js";
import { n4jUserToDiscordUser } from "util/functions/api/N4jUserToDiscordUser";
import type { Executor } from "../base/Executor";
import type { N4jClient } from "../base/N4jClient";
import { Query } from "../base/QueryBuilder";
import { RelationSimplifier } from "../helpers/RelationSimplifier";
import { N4jGuild } from "./N4jGuild";
import type { RelationType } from "./N4jRelation";

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
  public readonly client: N4jClient;
  public readonly executor: Executor;
  public readonly guild: N4jGuild;

  constructor(
    public readonly id: string,
    guild: N4jGuild | string,
    client?: N4jClient,
    public readonly elementId?: string,
    executor?: Executor,
  ) {
    this.client = client ?? Service("N4jClient");
    this.executor = executor ?? Service("Executor");
    // Convert into instance if not already
    this.guild = typeof guild === "string" ? new N4jGuild(guild) : guild;
  }

  /**
   * Creates a N4jUser from a command ctx.
   */
  public static fromCtx(ctx: Context) {
    if (!ctx.guild) {
      throw new Error("Guild is not defined.");
    }

    return new N4jUser(ctx.user.id, ctx.guild.id);
  }

  /**
   * Creates a N4jUser from any djs interaction.
   * More versatile as it can be used outside sern.
   * Can be used when ctx in unavailable (E.G: autocomplete)
   * @param i A Discord.js interaction
   *
   * @example
   * ```
   * execute: (i, sdt) => {
   *   const user = N4jUser.fromInteraction(i);
   *
   *   // Do some stuff
   * }
   * ```
   */
  public static fromInteraction(i: Interaction) {
    if (!i.guild) {
      throw new Error("Guild is not defined.");
    }

    return new N4jUser(i.user.id, i.guild.id);
  }

  /**
   * Creates a N4jUser from a string command options.
   * The options must contain a string option with the specific name.
   * @param name The name of the user option (defaults to "user")
   */
  public static fromOptions(
    ctx: Context,
    name = "user",
    type: "user" | "id" = "id",
  ) {
    // Resolving user
    let u: User | string | null;
    switch (type) {
      case "id":
        u = ctx.interaction.options.getString(name);
        break;
      case "user":
        u = ctx.interaction.options.getUser(name);
        break;
    }

    if (!u) {
      throw new Error(`${name} does not exist in options.`);
    }

    if (!ctx.guild) {
      throw new Error("Guild is not defined.");
    }

    return new N4jUser(u instanceof User ? u.id : u, ctx.guild.id);
  }

  // --------- Creation Methods --------- //

  public async marry(partner: N4jUser | string) {
    await this.newRelation("PARTNER_OF", partner);
  }

  public async addParent(parent: N4jUser | string) {
    parent =
      parent instanceof N4jUser
        ? parent
        : new N4jUser(parent, this.guild, this.client);
    return this.newRelation.call(parent, "PARENT_OF", this);
  }

  public async adopt(child: N4jUser | string) {
    return this.newRelation("PARENT_OF", child);
  }

  // --------- Deletion Methods --------- //

  /**
   * Removes the users partner(s).
   */
  public async divorce(partner: N4jUser | string) {
    // Require "partner" parameter as multiple partners can exist
    return this.remRelation("PARTNER_OF", partner);
  }

  /**
   * Removes the users parent(s).
   */
  public async emancipate() {
    return this.remRelation("PARENT_OF", "*", true);
  }

  public async disown(child: N4jUser | string) {
    return this.remRelation("PARENT_OF", child);
  }

  // ---------- Getter Methods ---------- //

  public async children() {
    return this.getRelatedUsers("PARENT_OF", true);
  }
  public async parents() {
    return this.getRelatedUsers("PARENT_OF");
  }
  public async partners() {
    return this.getRelatedUsers("PARTNER_OF");
  }

  public async tree(maxDepth?: number) {
    const query = new Query();
    const g = query.mergeGuild(this.guild.id);
    const u = query.mergeUser(this.id, g);
    const t = query.matchTree(u, maxDepth);
    query.return([`${t.users} AS u`, `${t.relations} AS r`]);

    return this.executor.run(query);
  }

  // --------------- Other -------------- //

  /**
   * High level method to calculate the relationship between 2 users in a human readable format.
   *
   * Uses lower level functions to get the shortest path from db and simplify it and then use relationship simplifier
   */
  public async pathTo(u: N4jUser | string) {
    u = this.userParameter(u);

    // Create query to calculate path
    const query = new Query();
    const g = query.mergeGuild(this.guild.id);
    const u1 = query.mergeUser(this.id, g);
    const u2 = query.mergeUser(u, g);

    const p = query.matchPath(u1, u2);
    query.return([p]);

    const response = await this.executor.run(query);
    const path = response.get(p);

    if (!path || path.length === 0) {
      return null; // No path exists
    }

    return path[0];
  }

  public async relationWith(u: N4jUser | string) {
    u = this.userParameter(u);

    const path = await this.pathTo(u);

    if (!path) {
      return null; // no relation;
    }

    const simplified = new RelationSimplifier(path).simplify();

    return simplified.join(" ");
  }

  public toDiscordUser(client: Client) {
    return n4jUserToDiscordUser(client, this.id);
  }

  public toString() {
    return `<@${this.id}>`;
  }

  // --------------- Helpers --------------- //

  /**
   * Gets all users that have a specific relationship with this user.
   * @param rel The type of relationship to look for
   * @param reverse If true, looks for users that this user has the relationship with instead of users that have the relationship with this user
   * @returns Array of related users
   */
  private async getRelatedUsers(rel: RelationType, reverse = false) {
    const query = new Query();
    const g = query.mergeGuild(this.guild.id);
    const u1 = query.mergeUser(this.id, g);

    const u2 = query.matchUserWhereRel(g, rel, u1, reverse);

    query.return([u2]);

    const exe = await this.executor.run(query);

    return exe.get("u");
  }

  private newRelation(rel: RelationType, user: N4jUser | string) {
    user = this.userParameter(user);

    const query = new Query();

    const guild = query.mergeGuild(this.guild.id);
    const u1 = query.mergeUser(this.id, guild);
    const u2 = query.mergeUser(user, guild);

    query.createRel(u1, rel, u2);

    return this.executor.run(query);
  }

  private remRelation(
    rel: RelationType,
    user: N4jUser | string,
    reverse = false,
    directional = true,
  ) {
    user = this.userParameter(user);

    const query = new Query();

    const guild = query.mergeGuild(this.guild.id);
    const u1 = query.mergeUser(this.id, guild);
    const u2 = query.mergeUser(user, guild);

    const r = query.matchRel(
      reverse ? u2 : u1,
      rel,
      reverse ? u1 : u2,
      directional,
    );
    query.delete(r);

    return this.executor.run(query);
  }

  /**
   * Essentially validates a user parameter.
   */
  private userParameter(u: N4jUser | string) {
    if (u instanceof N4jUser) return u.id;
    else return u;
  }
}
