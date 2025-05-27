import type { Disposable, Init } from "@sern/handler";
import { connect, disconnect, plugin } from "mongoose";
import { isDevMode } from "util/functions/other/isDevMode";

export interface MDBClientOptions {
  username: string;
  password: string;
  ip: string;
  port: number;
  db: string;
  authSource: string;
}

export class MDBClient implements Disposable, Init {
  private uri: string;

  private static readonly defaultOptions: Required<MDBClientOptions> = {
    username: "",
    password: "",
    ip: "localhost",
    port: 27017,
    db: "",
    authSource: "admin",
  };

  constructor(data: Partial<MDBClientOptions> = {}) {
    const mergedData = { ...MDBClient.defaultOptions, ...data };
    this.uri = this.createUri(mergedData);

    // Disable versionKey globally for all schemas (because fuck version keys)
    plugin((schema) => {
      schema.set("versionKey", false);
    });

    // Enable timestamps globally for all schemas
    plugin((schema) => {
      schema.set("timestamps", true);
    });
  }

  async connect() {
    await connect(this.uri);
  }
  async disconnect() {
    await disconnect();
  }

  // --------- sern --------- //

  /**
   * Starts client.
   * Will be automatically invoked by sern upon dependency creation.
   */
  async init() {
    await this.connect();
  }

  /**
   * Disconnects client.
   * Should be automatically invoked by sern upon client crash or close.
   */
  async dispose() {
    await this.disconnect();
  }

  private createUri(data: MDBClientOptions) {
    const { username, password, ip, port, db, authSource } = data;

    return `mongodb://${isDevMode() ? "" : `${username}:${password}@`}${ip}:${port}/${db}?authSource=${authSource}`;
  }
}
