import type { Disposable, Init } from "@sern/handler";
import { connect, disconnect, plugin } from "mongoose";

export type MDBCredentials = `${string}:${string}`
export type MDBUri = `mongodb://${`${MDBCredentials}@` | ""}${string}:${number}/${string}`

export class MDBClient implements Disposable, Init {
  constructor(
    private uri: MDBUri
  ) {
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
}
