import { Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { HNode, type HSubGroup, type HGraph as Structure } from "hierarchia";
import config from "../../../../config";
import PrimaryNode from "./components/PrimaryNode";
import SecondaryNode from "./components/SecondaryNode";

/**
 * Unionize's graph visualization engine to turn a graph structure returned from
 * Hierarchia into an image.
 * Uses @napi-rs/canvas to quickly complete the generation.
 *
 * @example
 * const visuEngine = new VisualizationEngine(graphStructure);
 * const graph = visuEngine.render();
 *
 * const buffer = graph.toBuffer();
 */
export class VisualizationEngine {
  private canvas: Canvas;
  private ctx: SKRSContext2D;
  private canvasCenterX: number;
  private canvasCenterY: number;

  /**
   * Creates a new instance of the engine.
   * @param s The graph structure to visualize
   * @param primaryNode A primary node to be identifiable in the drawing.
   */
  constructor(
    private s: Structure,
    private primaryNode?: string,
  ) {
    this.canvas = createCanvas(s.width, s.height);
    this.ctx = this.canvas.getContext("2d");

    // Calculate canvas center for coordinate transformation
    this.canvasCenterX = s.width / 2;
    this.canvasCenterY = s.height / 2;
  }

  /**
   * Transforms graph coordinates (0,0 at center) to canvas coordinates (0,0 at top-left)
   * @param x Graph x coordinate
   * @param y Graph y coordinate
   * @returns Canvas coordinates
   */
  private transformCoordinates(x: number, y: number): { x: number; y: number } {
    return {
      x: x + this.canvasCenterX,
      y: y + this.canvasCenterY,
    };
  }

  /**
   * Renders the graph structure to the canvas
   */
  public render() {
    // Strip generations to just nodes and subgroups:
    // Gen[] -> group[] -> node/subgroup[]
    const items: Array<HNode | HSubGroup> = [];

    // Iterate through all generations
    for (const gen of this.s.generations) {
      for (const group of gen.groups) {
        // Add all nodes from this group
        items.push(...group.members);

        // Add all subgroups from this group
        items.push(...group.subGroups);
      }
    }

    // Loop items and place on canvas
    for (const item of items) {
      if (item instanceof HNode) {
        // Transform coordinates before rendering
        const canvasPos = this.transformCoordinates(item.x!, item.y!);

        // Modify the node's coordinates for rendering
        item.x = canvasPos.x;
        item.y = canvasPos.y;

        // Single node
        if (this.primaryNode && item.id === this.primaryNode) {
          PrimaryNode.renderNode(this.ctx, item);
        } else {
          SecondaryNode.renderNode(this.ctx, item);
        }
      } else {
        // Subgroup
      }
    }
    // Draw all nodes at their designated spot.
    // Draw all edges according to anchor points.
  }

  /**
   * Returns a buffer with the rendered image
   * @param mimeType The MIME type for the output format
   * @returns Buffer containing the image data
   */
  public toBuffer(
    mimeType:
      | "image/png"
      | "image/jpeg"
      | "image/webp"
      | "image/avif" = "image/png",
  ): Buffer {
    switch (mimeType) {
      case "image/png":
        return this.canvas.toBuffer("image/png");
      case "image/jpeg":
      case "image/webp":
        return this.canvas.toBuffer(mimeType, 0.9); // 90% quality
      case "image/avif":
        return this.canvas.toBuffer("image/avif");
      default:
        return this.canvas.toBuffer("image/png");
    }
  }

  /**
   * Returns the canvas object for direct manipulation
   * @returns The canvas
   */
  public getCanvas(): Canvas {
    return this.canvas;
  }

  /**
   * Returns the canvas context for direct drawing operations
   * @returns The canvas context
   */
  public getContext(): SKRSContext2D {
    return this.ctx;
  }
}
