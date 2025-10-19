import type { SKRSContext2D } from "@napi-rs/canvas";
import type { HNode } from "hierarchia";
import config from "../../../../../config";

export abstract class BaseNode {
  protected settings = config.graph.node;

  /**
   * Validates that the node has valid position coordinates
   * @param node The node to validate
   * @throws Error if position is missing
   */
  protected validatePosition(node: HNode): void {
    // Pos' can be 0 (which is falsy)
    if (node.x  === undefined || node.y === undefined) {
      throw new Error("Pos missing on node: " + node.id);
    }
  }

  /**
   * Sets up the common text rendering context
   * @param ctx The canvas context
   * @param x The x coordinate for text positioning
   * @param y The y coordinate for text positioning
   */
  protected setupTextContext(ctx: SKRSContext2D, x: number, y: number): void {
    ctx.fillStyle = this.settings.text.color;
    ctx.font = this.settings.text.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  }

  /**
   * Renders the node text
   * @param ctx The canvas context
   * @param node The node to render text for
   */
  protected renderText(ctx: SKRSContext2D, node: HNode): void {
    this.setupTextContext(ctx, node.x!, node.y!);
    ctx.fillText(node.name, node.x!, node.y!);
  }

  /**
   * Abstract method that must be implemented by subclasses to draw the node shape
   * @param ctx The canvas context
   * @param node The node to render
   */
  protected abstract drawShape(ctx: SKRSContext2D, node: HNode): void;

  /**
   * Main render method that orchestrates the node drawing process
   * @param ctx The canvas context
   * @param node The node to render
   */
  public render(ctx: SKRSContext2D, node: HNode): void {
    this.validatePosition(node);

    ctx.save();

    this.drawShape(ctx, node);
    this.renderText(ctx, node);

    ctx.restore();
  }

  /**
   * Static method to render a node using the class it's called on
   * @param ctx The canvas context
   * @param node The node to render
   */
  static renderNode(ctx: SKRSContext2D, node: HNode): void {
    // Use the constructor of the class this method is called on
    new (this as any)().render(ctx, node);
  }
}
