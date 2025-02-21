/**
 * The error code returned from the cypher query.
 */
export enum N4jErrorCode {
  NotSameGuild = "USERS_NOT_IN_SAME_GUILD",
  UserNotFound = "USER_NOT_FOUND",
}

/**
 * An error that will be returned by the n4j client.
 * Represents an error that is thrown by cypher.
 */
export class N4jError extends Error {
  public override readonly cause: N4jErrorCode;

  constructor(e: N4jErrorCode) {
    super(e.toString());
    this.cause = e;
  }
}
