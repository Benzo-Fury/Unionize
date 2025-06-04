/** Returns whether the bot is running in development mode. */
export function isDevMode() {
  return Bun.env.PROCESS_MODE?.toLowerCase() === "dev";
}
