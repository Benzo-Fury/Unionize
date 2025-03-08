import type { EnvironmentVariables } from "ts/interfaces/EnvironmentVariables";

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

    // Looping through everything in the environment and loading it
    for (let key in Bun.env) {
      let value = Bun.env[key]!;

      // Checking if key ends with file
      if (key.endsWith("_FILE")) {
        key = key.replace("_FILE", "") as EnvironmentVariable;
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

  private resolveSecret(secretPath: string) {
    // Resolve the secret
    const file = Bun.file(secretPath);

    return file.text();
  }
}
