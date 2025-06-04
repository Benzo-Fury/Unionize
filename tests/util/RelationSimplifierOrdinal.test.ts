import { describe, expect, test } from "bun:test";
import { RelationSimplifier } from "util/classes/db/neo4j/helpers/RelationSimplifier";

// Access the private method using type assertion
const simplifier = new RelationSimplifier([]) as any;

describe("RelationSimplifier getOrdinalSuffix", () => {
  test("handles numbers in the teens correctly", () => {
    expect(simplifier.getOrdinalSuffix(11)).toBe("th");
    expect(simplifier.getOrdinalSuffix(12)).toBe("th");
    expect(simplifier.getOrdinalSuffix(13)).toBe("th");
  });

  test("handles large numbers correctly", () => {
    expect(simplifier.getOrdinalSuffix(111)).toBe("th");
    expect(simplifier.getOrdinalSuffix(112)).toBe("th");
    expect(simplifier.getOrdinalSuffix(113)).toBe("th");
    expect(simplifier.getOrdinalSuffix(121)).toBe("st");
    expect(simplifier.getOrdinalSuffix(122)).toBe("nd");
    expect(simplifier.getOrdinalSuffix(123)).toBe("rd");
  });
});
