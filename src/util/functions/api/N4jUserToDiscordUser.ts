import type { Client } from "discord.js";

export function n4jUserToDiscordUser(client: Client, id: string) {
  return client.users.fetch(id);
}
