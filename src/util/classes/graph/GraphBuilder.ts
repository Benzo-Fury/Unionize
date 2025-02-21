// import config from "#config";
// import { Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
// import * as d3 from "d3";
// import { D3Node } from "./D3Node";
// import { D3Relation, type D3RelationType } from "./D3Relation";

// /**
//  * The drawer function that is draws nodes onto a canvas
//  */
// export type Drawer = (context: SKRSContext2D, node: D3Node) => void;

// /**
//  * This class handles the creation and rendering of a graph, using D3.js for layout calculations and Canvas for drawing.
//  *
//  * ### Key Features:
//  * - **Efficient Graph Layout**: Uses D3.js to handle layout calculations, allowing it to handle complex, large-scale graphs with ease.
//  * - **Direct PNG Export**: Renders the graph directly to memory as a PNG, making it easy to export or integrate into other systems without needing file storage.
//  * - **Customizable Nodes and Edges**: Allows each node to draw itself, reducing code in the class itself and allowing endless customizability.
//  *
//  * ### Usage:
//  * ```
//  * ```
//  */
// export class FamilyGraphBuilder {
//   private nodes: D3Node[] = [];
//   private relations: D3Relation[] = [];
//   private canvas?: Canvas;
//   private simulationRan? = false;

//   /**
//    * Adds a node to the graph.
//    * First user is used as the primary user.
//    */
//   public addNode(id: string, name: string, drawer = FamilyGraphBuilder.drawer) {
//     // Creating and adding node
//     const node = new D3Node(id, name, drawer);
//     this.nodes.push(node);
//   }

//   /**
//    * Adds a relation between two users to the graph.
//    */
//   public addRelation(source: string, target: string, type: D3RelationType) {
//     const relation = new D3Relation(source, target, type);
//     this.relations.push(relation);
//   }

//   /**
//    * Filters any nodes that match the one specified from the graph.
//    */
//   public removeNode(id: string) {
//     // Filtering to exclude any nodes with that id
//     this.nodes = this.nodes.filter((n) => n.id !== id);
//   }

//   /**
//    * Filters any relation that match the one specified from the graph.
//    */
//   public removeRelation(source: string, target: string) {
//     this.relations = this.relations.filter(
//       (r) => r.source !== source && r.target !== target,
//     );
//   }

//   /**
//    * Deletes every node and relation in the graph.
//    */
//   public flush() {
//     this.nodes = [];
//     this.relations = [];
//   }

//   /**
//    * Validates the current tree.
//    * - Removes dupe relations & nodes
//    * - Removes any nodes without positions (they probably dont have a relation)
//    */
//   public validate() {
//     // Removing dupes
//     this.nodes = this.removeDuplicates(this.nodes, (node) => node.id);
//     this.relations = this.removeDuplicates(
//       this.relations,
//       (relation) => `${relation.source}-${relation.target}`,
//     );

//     // Removing nodes without positions
//     this.nodes = this.nodes.filter(
//       // Must not use ! operator here - that would check for falsy values and 0 is falsy.
//       (n) => n.x !== undefined && n.y !== undefined,
//     );
//   }

//   /**
//    * Runs the D3 simulation to determine where nodes should be.
//    */
//   public simulate(width: number, height: number) {
//     this.simulationRan = true;
//     if (this.nodes.length === 0) return;

//     // Assuming the first node is the root for the hierarchy
//     const rootNode = this.nodes[0];

//     // Create hierarchical structure considering "parent" relationships only as D3 doesn't support partners
//     const hierarchy = d3.hierarchy(rootNode, (node) => {
//       return this.relations
//         .filter((rel) => rel.source === node.id && rel.type === "parent")
//         .map((rel) => this.nodes.find((n) => n.id === rel.target)!);
//     });

//     const padding = config.graphCustomization.canvasPadding

//     // Generate tree layout for parent-child relationships
//     const treeLayout = d3.tree<D3Node>().size([
//       width - 2 * padding,
//       height - 2 * padding,
//     ]);
//     const root = treeLayout(hierarchy);

//     // Apply positions to nodes based on the tree layout
//     root.descendants().forEach((d) => {
//       const correspondingNode = this.nodes.find(
//         (node) => node.id === d.data.id,
//       );
//       if (correspondingNode) {
//         correspondingNode.x = d.x + padding;
//         correspondingNode.y = d.y + padding;
//       }
//     });

//     // ------------- Post Processing -------------- //

//     // Handle any partner relations
//     const partnerRelations = this.relations.filter((r) => r.type === "partner");

//     let depth = 0;
//     for (const relation of partnerRelations) {
//       depth++;

//       // Finding both nodes
//       const sourceNode = this.nodes.find((node) => node.id === relation.source);
//       const targetNode = this.nodes.find((node) => node.id === relation.target);

//       // Removing relation if either node is not found
//       if (!sourceNode || !targetNode) {
//         this.relations.filter(
//           (r) => r.source === relation.source && r.target === relation.target,
//         );
//         continue;
//       }

//       // Adjusting partner node
//       let offset = config.graphCustomization.partnerNodeOffset;

//       // Adjusting offset even more if relation is poly
//       if (depth > 1) {
//         for (let i = 0; i < depth; i++) {
//           offset += config.graphCustomization.partnerNodeOffset;
//         }
//       }

//       targetNode.x = offset;
//       targetNode.y = sourceNode.y; // Same vertical level
//     }

//     // Validating
//     this.validate();
//   }

//   public draw(
//     width: number = config.graphCustomization.canvasWidth,
//     height: number = config.graphCustomization.canvasHeight,
//     resolution: number = 1,
//   ) {
//     // Creating canvas
//     const data = this.createCanvas(width, height, resolution);

//     // Ensuring simulation has ran.
//     if (!this.simulationRan) {
//       // 50 px padding - ADD CUSTOMIZATION TO CONFIG
//       const modifiedHeight = height - 50;
//       const modifiedWidth = width - 50;
//       this.simulate(modifiedWidth, modifiedHeight);
//     }

//     // Drawing nodes onto canvas
//     this.nodes.forEach((node) => {
//       node.draw(data.context, node);
//     });

//     // Setting canvas
//     this.canvas = data.canvas;

//     return data.canvas;
//   }

//   /**
//    * Buffers out the current graph as a png.
//    */
//   public buffer() {
//     if (!this.canvas) {
//       throw new Error(
//         "No canvas drawing found. Did you forget to use .draw()?",
//       );
//     }

//     // Return the PNG buffer from the canvas
//     return this.canvas.toBuffer("image/png");
//   }

//   // -------------- Helpers -------------- //

//   /**
//    * Removes duplicates from an array based on a uniqueness key.
//    */
//   private removeDuplicates<T>(items: T[], getKey: (item: T) => string): T[] {
//     const uniqueItems = new Map<string, T>();

//     for (const item of items) {
//       const key = getKey(item);
//       if (!uniqueItems.has(key)) {
//         uniqueItems.set(key, item);
//       } else {
//         console.warn(`Removing duplicate with key: ${key}`);
//       }
//     }

//     return Array.from(uniqueItems.values());
//   }

//   private createCanvas(width: number, height: number, scaleFactor: number) {
//     const canvas = createCanvas(width, height);
//     const context = canvas.getContext("2d");

//     // Setting resolution
//     context.scale(scaleFactor, scaleFactor);

//     // Setting default properties
//     context.fillStyle = config.graphCustomization.bgColor;
//     context.fillRect(0, 0, width, height);

//     return {
//       canvas,
//       context,
//     };
//   }

//   /**
//    * The default method to draw nodes.
//    * Typically not used however is just here for example purposes.
//    */
//   static drawer(context: SKRSContext2D, node: D3Node) {
//     // Draw the node's circle
//     context.beginPath();
//     context.arc(node.x!, node.y!, 20, 0, 2 * Math.PI);
//     context.fillStyle = "steelblue";
//     context.fill();

//     // Set text properties
//     context.font = "12px Arial";
//     context.fillStyle = "black";
//     context.textAlign = "center";
//     context.textBaseline = "middle";

//     // Draw the node's name
//     if (node.name) {
//       context.fillText(node.name, node.x!, node.y! + 20 + 10); // Adjust position as needed
//     }
//   }
// }
