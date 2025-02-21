// import config from "#config";
// import type { SKRSContext2D } from "@napi-rs/canvas";
// import type { D3Node } from "../../classes/other/GraphBuilder";

// export function familyNodeDrawerPrimary(context: SKRSContext2D, node: D3Node) {
//   const settings = config.graphCustomization.defaultPrimaryNode;

//   // Set default values for styling and customization
//   const font = settings.font;
//   const textColor = settings.fontColor;
//   const bgColor = settings.fillColor;
//   const borderColor = settings.borderColor;
//   const borderWidth = parseInt(settings.borderWeight);
//   const borderRadius = parseInt(settings.borderRadius);
//   const paddingTop = parseInt(settings.paddingTop);
//   const paddingSides = parseInt(settings.paddingSides);
//   const maxWidth = parseInt(settings.maxWidth);
//   const minWidth = parseInt(settings.minWidth);

//   // Set font for measuring text width
//   context.font = font;

//   // Calculate the initial width of the text plus padding
//   let text = node.name;
//   let textWidth = context.measureText(text).width;
//   let width = Math.max(minWidth, textWidth + paddingSides * 2);

//   // Adjust text if it exceeds maxWidth
//   if (width > maxWidth) {
//     while (
//       text.length > 0 &&
//       context.measureText(text + "...").width + paddingSides * 2 > maxWidth
//     ) {
//       text = text.slice(0, -1); // Remove last character
//     }
//     text += "..."; // Add ellipsis to indicate truncation
//     textWidth = context.measureText(text).width;
//     width = Math.max(minWidth, textWidth + paddingSides * 2); // Recalculate width with truncated text
//   }

//   // Set the context's fill and stroke styles
//   context.fillStyle = bgColor;
//   context.strokeStyle = borderColor;
//   context.lineWidth = borderWidth;

//   // Calculate the height based on font size and padding
//   const height = parseInt(font, 10) + paddingTop * 2; // Total height includes top padding

//   // Draw the pill with rounded corners
//   const x = node.x! - width / 2;
//   const y = node.y! - height / 2;
//   context.beginPath();
//   context.moveTo(x + borderRadius, y);
//   context.lineTo(x + width - borderRadius, y);
//   context.arcTo(x + width, y, x + width, y + borderRadius, borderRadius);
//   context.lineTo(x + width, y + height - borderRadius);
//   context.arcTo(
//     x + width,
//     y + height,
//     x + width - borderRadius,
//     y + height,
//     borderRadius,
//   );
//   context.lineTo(x + borderRadius, y + height);
//   context.arcTo(x, y + height, x, y + height - borderRadius, borderRadius);
//   context.lineTo(x, y + borderRadius);
//   context.arcTo(x, y, x + borderRadius, y, borderRadius);
//   context.closePath();

//   // Fill and stroke the pill shape
//   context.fill();
//   if (borderWidth > 0) {
//     context.stroke();
//   }

//   // Draw the text in the center of the pill shape
//   context.fillStyle = textColor; // Set text color
//   context.textAlign = "center";
//   context.textBaseline = "middle";
//   context.fillText(text, node.x!, node.y!);
// }
