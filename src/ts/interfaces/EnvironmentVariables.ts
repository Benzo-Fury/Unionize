export interface EnvironmentVariables {
  BOT_TOKEN: string;
  N4J_AUTH: string;
  MONGO_USERNAME: string;
  MONGO_PASSWORD: string;
  PROCESS_MODE: "DEV" | "PROD";
}
