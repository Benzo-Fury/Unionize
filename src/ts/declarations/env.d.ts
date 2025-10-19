import type { EnvironmentVariables } from "ts/interfaces/EnvironmentVariables";
import { type AuthString } from "./util/classes/db/neo4j/base/N4jClient.ts";

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      DISCORD_TOKEN: string;
      N4J_AUTH: AuthString;
      MONGO_URI: MDBUri;
      NODE_ENV: "Development" | "Production";
    }
  }
}

export {};
