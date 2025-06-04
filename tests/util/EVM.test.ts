import { describe, expect, test } from "bun:test";
import { EVM } from "util/classes/local/EnvironmentVariableManager";

// Helper function to clear test variables after each run
function clearVars() {
  delete Bun.env.BOT_TOKEN;
  delete Bun.env.MONGO_URI;
}

describe("EnvironmentVariableManager", () => {
  test("loads existing environment variables", async () => {
    Bun.env.BOT_TOKEN = "token123";
    const evm = await EVM.new();
    expect(evm.load("BOT_TOKEN")).toBe("token123");
    clearVars();
  });

  test("throws when variable does not exist", async () => {
    clearVars();
    const evm = await EVM.new();
    expect(() => evm.load("MONGO_URI")).toThrow();
  });
});
