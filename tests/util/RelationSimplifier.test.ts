import { describe, expect, test } from "bun:test";
import { RelationSimplifier } from "util/classes/db/neo4j/helpers/RelationSimplifier";

describe("RelationSimplifier", () => {
  test("Simplify a simple parent of relation", () => {
    const simplifier = new RelationSimplifier(["PARENT_OF"]);
    expect(simplifier.simplify()).toEqual(["parent"]);
  });

  test("Simplify a great grandparent relationship", () => {
    const simplifier = new RelationSimplifier([
      "PARENT_OF",
      "PARENT_OF",
      "PARENT_OF",
    ]);
    expect(simplifier.simplify()).toEqual(["great", "grandparent"]);
  });

  test("Simplify a complex sibling relation", () => {
    const simplifier = new RelationSimplifier([
      "PARENT_OF",
      "PARTNER_OF",
      "CHILD_OF",
    ]);
    expect(simplifier.simplify()).toEqual(["sibling"]);
  });

  test("Simplify extremely complex cousin relation", () => {
    const simplifier = new RelationSimplifier([
      "PARENT_OF",
      "PARENT_OF",
      "PARENT_OF",
      "PARENT_OF",
      "PARENT_OF",
      "PARENT_OF",
      "PARENT_OF",
      "PARENT_OF",
      "PARENT_OF",
      "PARENT_OF", // Up 10 generations
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF", // Down 10 generations (cousin level)
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF",
      "CHILD_OF", // 5 times removed
    ]);
    expect(simplifier.simplify()).toEqual([
      "9th",
      "cousin",
      "5",
      "times",
      "removed",
    ]); 
  });
});
