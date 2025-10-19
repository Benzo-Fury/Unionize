import type { SKRSContext2D } from "@napi-rs/canvas";
import type { HNode } from "hierarchia";
import { BaseNode } from "./BaseNode";

export default class PrimaryNode extends BaseNode {
  /**
   * Draws a pill-shaped node with rounded corners
   * @param ctx The canvas context
   * @param node The node to render
   */
  protected drawShape(ctx: SKRSContext2D, node: HNode): void {
    const x = node.x!;
    const y = node.y!;

    // Use the pre-calculated dimensions from the layout engine
    const pillWidth = node.xSpace;
    const pillHeight = node.ySpace;
    const radius = this.settings.borderRadius;

    // Calculate pill bounds using the provided dimensions
    const leftX = x - pillWidth / 2;
    const rightX = x + pillWidth / 2;
    const topY = y - pillHeight / 2;
    const bottomY = y + pillHeight / 2;

    // Create pill path
    ctx.beginPath();

    // Top edge
    ctx.moveTo(leftX + radius, topY);
    ctx.lineTo(rightX - radius, topY);

    // Top-right corner
    ctx.arcTo(rightX, topY, rightX, topY + radius, radius);

    // Right edge
    ctx.lineTo(rightX, bottomY - radius);

    // Bottom-right corner
    ctx.arcTo(rightX, bottomY, rightX - radius, bottomY, radius);

    // Bottom edge
    ctx.lineTo(leftX + radius, bottomY);

    // Bottom-left corner
    ctx.arcTo(leftX, bottomY, leftX, bottomY - radius, radius);

    // Left edge
    ctx.lineTo(leftX, topY + radius);

    // Top-left corner
    ctx.arcTo(leftX, topY, leftX + radius, topY, radius);

    ctx.closePath();

    // Fill the pill
    ctx.fillStyle = this.settings.fillColor;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = this.settings.borderColor;
    ctx.lineWidth = this.settings.borderWidth;
    ctx.stroke();
  }
}
