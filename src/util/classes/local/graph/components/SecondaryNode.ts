import type { SKRSContext2D } from "@napi-rs/canvas";
import type { HNode } from "hierarchia";
import { BaseNode } from "./BaseNode";

export default class SecondaryNode extends BaseNode {
  /**
   * Draws a square-shaped node with border
   * @param ctx The canvas context
   * @param node The node to render
   */
  protected drawShape(ctx: SKRSContext2D, node: HNode): void {
    const x = node.x!;
    const y = node.y!;

    // Calculate square bounds
    const leftX = x - node.xSpace / 2;
    const topY = y - node.ySpace / 2;

    // Draw square
    ctx.beginPath();
    ctx.rect(leftX, topY, node.xSpace, node.ySpace);
    ctx.closePath();

    // Draw border
    ctx.strokeStyle = this.settings.borderColor;
    ctx.lineWidth = this.settings.borderWidth;
    ctx.stroke();
  }
}
