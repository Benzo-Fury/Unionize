import type { Logging, LogPayload } from "@sern/handler";

/**
 * Minimal logger used by the test environment. It simply pipes
 * all log messages to the console.
 */
export class Logger implements Logging {
  /** Emits an error level log. */
  error(payload: LogPayload<unknown>): void {
    console.error(payload.message);
  }

  /** Emits an info level log. */
  info(payload: LogPayload<unknown>): void {
    console.log(payload.message);
  }

  /** Emits a warning level log. */
  warning(payload: LogPayload<unknown>): void {
    console.warn(payload.message);
  }

  /** Emits a debug level log. */
  debug(payload: LogPayload<unknown>): void {
    console.debug(payload.message);
  }
}
