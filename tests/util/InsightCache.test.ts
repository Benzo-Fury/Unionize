import { describe, expect, test } from "bun:test";
import { InsightCache } from "util/classes/local/InsightCache";
import config from "#config";

interface TestInsight {
  _id: string;
  type: "fact" | "tip" | "other";
  content: string;
  priority: number;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
  iconUrl?: string;
}

describe("InsightCache", () => {
  test("getRandom respects priority and sets default icons", () => {
    const cache = new InsightCache();
    const now = new Date();

    const insights: TestInsight[] = [
      {
        _id: "1",
        type: "fact",
        content: "f1",
        priority: 1,
        addedBy: "a",
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: "2",
        type: "tip",
        content: "t1",
        priority: 3,
        addedBy: "b",
        createdAt: now,
        updatedAt: now,
      },
    ];

    cache.add(insights as any);

    const originalRandom = Math.random;

    Math.random = () => 0.1; // Should pick first insight
    let res = cache.getRandom()!;
    expect(res.content).toBe("f1");
    expect(res.iconUrl).toBe(config.database.collections.insight.defaultIconUrls.fact);

    Math.random = () => 0.9; // Should pick second insight
    res = cache.getRandom()!;
    expect(res.content).toBe("t1");
    expect(res.iconUrl).toBe(config.database.collections.insight.defaultIconUrls.tip);

    Math.random = originalRandom;
  });
});
