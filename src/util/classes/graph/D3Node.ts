import type { SimulationNodeDatum } from "d3";
import type { Drawer } from "./GraphBuilder";

/**
 * Represents a node stored in the D3 graph builder.
 */
export class D3Node implements SimulationNodeDatum {
  public x?: number;
  public y?: number;

  constructor(
    public id: string,
    public name: string,
    /**
     * The function responsible for drawing the node onto the canvas
     */
    public draw: Drawer,
  ) {}
}
