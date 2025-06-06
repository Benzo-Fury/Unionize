import { commandModule as sernCommandModule } from "@sern/handler";
import { dispose } from "util/plugins/dispose";

type InputCommand = Parameters<typeof sernCommandModule>[0]; // Sern doesn't export InputCommand

/**
 * Small wrapper around `commandModule` that injects default plugins.
 */
export function commandModule(mod: InputCommand) {
  const merge: InputCommand = {
    plugins: [dispose()], // Default plugins
    ...mod,
  };

  return sernCommandModule(merge);
}
