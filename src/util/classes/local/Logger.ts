import type { Logging, LogPayload } from "@sern/handler";

export class Logger implements Logging {
  error(payload: LogPayload<unknown>): void {
    console.error(payload.message);
  }
  info(payload: LogPayload<unknown>): void {
    console.log(payload.message);
  }
  warning(payload: LogPayload<unknown>): void {
    console.warn(payload.message);
  }
  debug(payload: LogPayload<unknown>): void {
    console.debug(payload.message);
  }
}
