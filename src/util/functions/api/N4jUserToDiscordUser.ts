import type { Client } from "discord.js";

/**
 * Resolves a Neo4j user id to a Discord.js {@link User} via the REST API.
 */
export function n4jUserToDiscordUser(client: Client, id: string) {
  return client.users.fetch(id);
}
