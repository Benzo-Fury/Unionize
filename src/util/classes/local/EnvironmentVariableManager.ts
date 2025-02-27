import type { EnvironmentVariables } from "ts/interfaces/EnvironmentVariables";

const variableKeys = [
  "BOT_TOKEN_FILE",
  "N4J_AUTH_FILE",
  "MONGO_USERNAME_FILE",
  "MONGO_PASSWORD_FILE",
];

type EnvironmentVariable = keyof EnvironmentVariables;

/**
 * The Environment Variable Manager (EVM) is the preferred way to load environment variables in code.
 *
 * It ensures that any environment variables loaded are resolved if they are secrets (secrets are only stored as files).
 */
export class EVM {
  private vars = new Map<EnvironmentVariable, string>();

  /**
   * Use `#EVM.new()`.
   */
  private constructor() {}

  public static async new() {
    const evm = new EVM();
    for (const key of variableKeys) {
      let value = Bun.env[key]!;

      // Checking if key is actually a file
      if (key.endsWith("FILE")) {
        // Resolving if true
        value = await evm.resolveSecret(value);
      }

      evm.vars.set(key as EnvironmentVariable, value.trim()); // Trimming to remove trailing spaces
    }

    return evm;
  }

  public load(key: EnvironmentVariable) {
    const value = this.vars.get(key);

    if (!value) {
      throw new Error(`No entry for key: ${key}.`);
    }

    return value;
  }

  private async resolveSecret(secretPath: string) {
    // Resolve the secret
    const file = Bun.file(secretPath);

    return file.text();
  }
}
