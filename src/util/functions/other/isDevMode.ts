export function isDevMode() {
  return Bun.env.PROCESS_MODE?.toLowerCase() === "dev";
}
