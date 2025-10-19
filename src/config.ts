import type { ColorResolvable } from "discord.js";
import type { Relation } from "util/classes/db/neo4j/helpers/RelationSimplifier";

const config = {
  // sern
  sern: {
    commands: ["./src/modules/commands", "./src/modules/components"],
    events: "./src/modules/events",
  },

  // Discord
  ids: {
    guilds: {
      neoDevelops: "1118668952147603457",
    },
    users: {
      neo: "671610612475756576",
    },
    channels: {
      errors: "1309341609099264101",
    },
    buttons: {
      acceptProposal: "accept-proposal/", // Prefix only
      declineProposal: "decline-proposal/", // Prefix Only
    },
  },
  api: {
    maxActionRowLength: 5,
  },

  embedCustomization: {
    default: {
      color: 16410624, // #FA6800
    },
    errorColor: "#f22952",
  },

  // Graph Visualization
  graph: {
    node: {
      fillColor: "#FA6800",
      borderColor: "#000000",
      borderWidth: 2,
      borderRadius: 20,
      text: {
        font: "bold 14px 'Segoe UI', 'Arial Black', 'Helvetica Black', sans-serif",
        color: "#000000",
        maxLength: 20,
      },
      padding: {
        horizontal: 16,
        vertical: 8,
      },
    },
  },

  // DB
  database: {
    cypherScriptDirectory: `${process.cwd()}/scripts/cypher`,
    maxTreeRecursiveDepth: 100,
    collections: {
      insight: {
        maxLength: 250,
        defaultIconUrls: {
          fact: "https://images.emojiterra.com/twitter/v11/512px/1f9e0.png",
          tip: "https://whatemoji.org/wp-content/uploads/2020/07/Light-Bulb-Emoji.png",
        },
      },
      guilds: {
        settings: {
          relations: {
            minIncestLevel: 0,
            maxIncestLevel: 7,
            defaultIncestLevel: 0,
          },
        },
      },
    },
  },

  other: {
    ILMap: {
      parent: 7,
      child: 7,
      sibling: 6,
      "aunt/uncle": 5,
      "niece/nephew": 5,
      "1st cousin": 4,
      "2nd cousin": 3,
      "3rd cousin": 3,
      "4th cousin": 3,
      "5th cousin": 2,
      "6th cousin": 2,
      "7th cousin": 1,
      "8th cousin": 1,
      "9th cousin": 1,
      "10th cousin": 1,
    } as Record<string, number>,
  },
};

export default config;
