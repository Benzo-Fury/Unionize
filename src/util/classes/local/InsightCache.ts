import config from "#config";
import type { Init } from "@sern/handler";
import type { Insight } from "../../schemas/insight.schema";

export class InsightCache implements Init {
  private pool: Insight[] = [];
  private normalizedPool: { insight: Insight; probability: number }[] = [];

  public async init() {
    await this.loadAll();
  }

  /**
   * Automatically loads all insights from the database.
   */
  public async loadAll() {
    const { InsightModel } = await import("../../schemas/insight.schema");

    this.pool.push(...(await InsightModel.find()));
    this.normalizeWeights(); // Normalize weights after loading
  }

  /**
   * Adds more insights to the pool.
   */
  public add(insights: Insight[]) {
    this.pool.push(...insights);
    this.normalizeWeights(); // Re-normalize weights after adding
  }

  public getPool() {
    return this.pool;
  }

  /**
   * Selects a random insight from the normalized pool.
   *
   * This method uses normalized probabilities calculated from the priority of each insight.
   * Higher priority insights have a greater chance of being selected.
   *
   * How it works:
   * 1. Each insight's priority is normalized into a probability relative to the total pool weight.
   * 2. A random number between 0 and 1 is generated.
   * 3. Insights are selected based on cumulative probability ranges.
   *
   * Returns:
   * - A randomly selected Insight object based on priority weighting.
   * - Null if no insights are available.
   */

  public getRandom(): Insight | null {
    if (this.normalizedPool.length === 0) {
      return null; // No insights available
    }

    const randomValue = Math.random(); // Random number between 0 and 1
    let cumulativeProbability = 0;

    for (const entry of this.normalizedPool) {
      cumulativeProbability += entry.probability;
      if (randomValue <= cumulativeProbability) {
        this.validate(entry.insight);
        return entry.insight;
      }
    }

    return null; // Fallback, shouldn't happen
  }

  /**
   * Normalizes weights into probabilities.
   */
  private normalizeWeights() {
    const totalWeight = this.pool.reduce((sum, insight) => {
      return sum + insight.priority;
    }, 0);

    this.normalizedPool = this.pool.map((insight) => {
      const weight = insight.priority; // Default priority is 1
      const probability = weight / totalWeight; // Normalize to a fraction
      return { insight, probability };
    });
  }

  /**
   * Validates and assigns default values to an insight.
   */
  private validate(insight: Insight) {
    const defaultIconUrls = config.database.collections.insight.defaultIconUrls;

    // Assigning default iconUrl if one is not provided
    if (!insight.iconUrl) {
      switch (insight.type) {
        case "fact":
          insight.iconUrl = defaultIconUrls.fact;
          break;
        case "tip":
          insight.iconUrl = defaultIconUrls.tip;
          break;
      }
    }
  }
}
