import type { EnvironmentVariables } from "ts/interfaces/EnvironmentVariables";

declare global {
  namespace NodeJS {
    export interface ProcessEnv extends EnvironmentVariables {}
  }
}

export {};
