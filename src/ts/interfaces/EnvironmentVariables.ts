import type { MDBUri } from "util/classes/db/mongodb/MDBClient";

export interface EnvironmentVariables {
  BOT_TOKEN: string;
  N4J_AUTH: string;
  MONGO_URI: MDBUri;
  PROCESS_MODE: "DEV" | "PROD";
}
