import { type Context, Service } from "@sern/handler";
import {
  type Client,
  type Collection,
  type Guild,
  type GuildMember,
  type Interaction,
  User,
} from "discord.js";
import { n4jUserToDiscordUser } from "util/functions/api/N4jUserToDiscordUser";
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
    const n4j = Service("N4jDataInterpreter");

    if (!i.guild) {
      throw new Error("Guild is not defined.");
    }

    return new N4jUser(i.user.id, i.guild.id, n4j);
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
    // Resolving n4j
    const n4j = Service("N4jDataInterpreter");

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

    return new N4jUser(u instanceof User ? u.id : u, ctx.guild.id, n4j);
  }

  public async marry(partner: N4jUser | string) {
    await this.newRelation("PARTNER_OF", partner);
  }

  public async addParent(parent: N4jUser | string) {
    return this.newRelation("PARENT_OF", parent);
  }

  public async adopt(child: N4jUser | string) {
    return this.newRelation("CHILD_OF", child);
  }

  public async divorce(partner: N4jUser | string) {
    // Require "partner" parameter as multiple partners can exist
    return this.remRelation("PARTNER_OF", partner);
  }

  /**
   * Emancipates your parent. If you have multiple parents, both will be removed.
   */
  public async emancipate() {
    return this.dataInterpreter.deleteAll(this.id, this.guild.id, "PARENT_OF");
  }

  public async disown(child: N4jUser | string) {
    return this.remRelation("CHILD_OF", child);
  }

  public async pathTo(user: N4jUser | string) {
    user = this.userParameter(user);

    return this.dataInterpreter.generateRelationPath(
      this.id,
      user,
      this.guild.id,
    );
  }

  public async children() {
    return this.getAll("CHILD_OF");
  }
  public async parents() {
    return this.getAll("PARENT_OF");
  }
  public async partners() {
    return this.getAll("PARTNER_OF");
  }

  public toDiscordUser(client: Client) {
    return n4jUserToDiscordUser(client, this.id);
  }

  public toString() {
    return `<@${this.id}>`;
  }

  // --------------- Helpers --------------- //

  private async getAll(rel: LocalRelation) {
    const users =
      (await this.dataInterpreter.getAll(this.id, this.guild.id, rel)) || [];

    return new N4jUserMap(users);
  }

  private newRelation(relation: LocalRelation, user: N4jUser | string) {
    user = this.userParameter(user);

    return this.dataInterpreter.createRelation(
      {
        user1Id: this.id,
        relation: relation,
        user2Id: user,
        properties: {},
      },
      this.guild.id,
    );
  }

  private remRelation(relation: LocalRelation, user: N4jUser | string) {
    user = this.userParameter(user);

    return this.dataInterpreter.deleteRelation(
      {
        relation: relation,
        user1Id: this.id,
        user2Id: user,
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

/**
 * The N4jUserMap exists to be a container that holds multiple users.
 * It has methods for mass converting users.
 *
 * ## Rules
 * This is a N4j model and is therefor allowed to call queries via the data interpreter.
 *
 * @example
 * const users = n4jUser.children();
 *
 * const map = new N4jUserMap(users);
 *
 * const members = map.toMembers();
 */
export class N4jUserMap extends Map<string, N4jUser> {
  constructor(users?: N4jUser[]) {
    super(users?.map((u) => [u.id, u]));
  }

  /**
   * Converts all existing users into discord.js members via the api.
   *
   * @param guild The guild to fetch the members on.
   */
  public async toMembers(guild: Guild) {
    const users = Array.from(this).map((i) => i[0]); // Maps into an array of user ids

    const members = await guild.members.fetch({
      user: users,
    });

    await this.prune(members);

    return members;
  }

  /**
   * Takes a collection of members that were returned from the djs api...
   * any users that dont exist according to the api are removed from Neo4j.
   * This is to keep the db clean, removing users that no longer exist in discord.
   * Essentially our own form of garbage collection.
   *
   * Instead, perhaps we should create some sort of N4j garbage collection class that handles this.
   * It can be called anywhere (including by a command executed by an admin)
   * @param members
   */
  public async prune(members: Collection<string, GuildMember>) {
    const missing: N4jUser[] = [];
    for (const u of this.values()) {
      if (!members.has(u.id)) {
        missing.push(u);
      }
    }

    // Prune from db
  }
}
