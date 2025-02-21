import { REST, Routes } from "discord.js";

/**
 * Takes a bot token and resolves it into the id.
 */
export async function resolveId(t: string): Promise<string> {
  try {
    const rest = new REST().setToken(t);

    const bot = (await rest.get(Routes.currentApplication())) as any;

    return bot.id;
  } catch (e) {
    throw new Error("Error whilst fetching your application: " + e);
  }
}
