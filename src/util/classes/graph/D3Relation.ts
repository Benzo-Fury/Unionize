import type { SimulationLinkDatum } from "d3";
import type { D3Node } from "./D3Node";

export type D3RelationType = "parent" | "partner"

/**
 * Represents a relation stored in the D3 graph builder.
 */
export class D3Relation implements SimulationLinkDatum<D3Node> {
  constructor(
    public source: string,
    public target: string,
    public type: D3RelationType,
  ) {}
}
