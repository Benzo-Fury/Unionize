import { describe, expect, test } from "bun:test";
import { Query } from "../../../src/util/classes/db/neo4j/base/QueryBuilder";
import type { CypherIdentifier } from "../../../src/util/classes/db/neo4j/base/QueryBuilder";
import type { DBRelation } from "../../../src/util/classes/db/neo4j/models/N4jRelation";

/**
 * This file was AI-generated.
 * @generated
 */

describe("QueryBuilder", () => {
  test("should create a new Query instance", () => {
    const query = new Query();
    expect(query).toBeInstanceOf(Query);
    expect(query.toString()).toBe("");
  });

  test("should merge a user node", () => {
    const query = new Query();
    const guild = query.mergeGuild("guild123");
    const user = query.mergeUser("user456", guild);

    expect(user).toMatch(/^u_\d+$/);
    expect(guild).toMatch(/^g_\d+$/);

    const queryString = query.toString();
    expect(queryString).toContain("MERGE (g_1:Guild { id: guild123 })");
    expect(queryString).toContain("ON CREATE SET g_1.createdOn = timestamp()");
    expect(queryString).toContain(
      `MERGE (${user}:User { id: user456 })-[:MEMBER_OF]->(${guild})`,
    );
    expect(queryString).toContain(
      `ON CREATE SET ${user}.createdOn = timestamp()`,
    );
  });

  test("should create relationships between users", () => {
    const query = new Query();
    const guild = query.mergeGuild("guild123");
    const user1 = query.mergeUser("user1", guild);
    const user2 = query.mergeUser("user2", guild);

    // Test PARENT_OF relationship
    const parentRel = query.createRel(user1, "PARENT_OF" as DBRelation, user2);
    expect(parentRel).toMatch(/^r_\d+$/);

    const parentQueryString = query.toString();
    expect(parentQueryString).toContain(
      `MERGE (${user1})-[${parentRel}:PARENT_OF]->(${user2})`,
    );
    expect(parentQueryString).toContain(
      `ON CREATE SET ${parentRel}.createdOn = timestamp()`,
    );

    query.clear();

    // Test PARTNER_OF relationship
    const partnerRel = query.createRel(
      user1,
      "PARTNER_OF" as DBRelation,
      user2,
    );
    expect(partnerRel).toMatch(/^r_\d+$/);

    const partnerQueryString = query.toString();
    expect(partnerQueryString).toContain(
      `MERGE (${user1})-[${partnerRel}:PARTNER_OF]->(${user2})`,
    );
    expect(partnerQueryString).toContain(
      `ON CREATE SET ${partnerRel}.createdOn = timestamp()`,
    );
  });

  test("should set properties on nodes", () => {
    const query = new Query();
    const guild = query.mergeGuild("guild123");
    query.setProperties(guild, { name: "Test Guild", memberCount: 100 });

    const queryString = query.toString();
    expect(queryString).toContain(
      `SET ${guild}.name = "Test Guild", ${guild}.memberCount = 100`,
    );
  });

  test("should add WHERE conditions", () => {
    const query = new Query();
    const guild = query.mergeGuild("guild123");
    query.where([`${guild}.memberCount > 50`, `${guild}.name = "Test"`]);

    const queryString = query.toString();
    expect(queryString).toContain(
      `WHERE ${guild}.memberCount > 50 AND ${guild}.name = "Test"`,
    );
  });

  test("should delete nodes", () => {
    const query = new Query();
    const guild = query.mergeGuild("guild123");
    query.delete(guild);

    const queryString = query.toString();
    expect(queryString).toContain(`DETACH DELETE (${guild})`);
  });

  test("should handle manual queries", () => {
    const query = new Query();
    query.manual("MATCH (n) RETURN count(n) as count");

    const queryString = query.toString();
    expect(queryString).toBe("MATCH (n) RETURN count(n) as count");
  });

  test("should return specified properties", () => {
    const query = new Query();
    const guild = query.mergeGuild("guild123");
    query.return([`${guild}.name`, `${guild}.memberCount`]);

    const queryString = query.toString();
    expect(queryString).toContain(`RETURN ${guild}.name, ${guild}.memberCount`);
  });

  test("should clear the query", () => {
    const query = new Query();
    const guild = query.mergeGuild("guild123");
    expect(query.toString()).not.toBe("");

    query.clear();
    expect(query.toString()).toBe("");
  });

  test("should validate IDs when enabled", () => {
    const query = new Query({ validateIds: true });
    expect(() => query.mergeGuild("")).toThrow("Invalid guild ID: ");
    expect(() => query.mergeGuild("   ")).toThrow("Invalid guild ID:    ");
    expect(() => query.mergeUser("", "g_1" as CypherIdentifier<"g">)).toThrow(
      "Invalid user ID: ",
    );
  });

  test("should not validate IDs when disabled", () => {
    const query = new Query({ validateIds: false });
    expect(() => query.mergeGuild("")).not.toThrow();
    expect(() =>
      query.mergeUser("", "g_1" as CypherIdentifier<"g">),
    ).not.toThrow();
  });

  test("should not add timestamps when disabled", () => {
    const query = new Query({ addTimestamps: false });
    const guild = query.mergeGuild("guild123");
    const user = query.mergeUser("user456", guild);
    const rel = query.createRel(user, "PARENT_OF" as DBRelation, user);

    const queryString = query.toString();
    expect(queryString).not.toContain("createdOn");
    expect(queryString).not.toContain("timestamp()");
  });
});
