import config from "#config";
import {
  type Document,
  Model,
  model,
  Schema,
  type SchemaTimestampsConfig,
} from "mongoose";
import { id } from "./templates/id";

// --------------------- Sub Schemas --------------------- //

// --- Guild Relation Settings --- //

export interface IGuildRelationSettings extends Document {
  IL: number;
}

export const guildRelationSettings = new Schema<IGuildRelationSettings>({
  IL: {
    type: Number,
    required: true,
    min: 0,
    max: 7,
    default:
      config.database.collections.guilds.settings.relations.defaultIncestLevel,
  },
});

// ----- Guild Settings ----- //

export interface IGuildSettings extends Document {
  relationships: IGuildRelationSettings;
}

export const guildSettingsSchema = new Schema<IGuildSettings>({
  relationships: {
    type: guildRelationSettings,
    required: true,
    default: () => ({}), // Default to a new instance
  },
});

// --------------------- Main Schema --------------------- //

export interface IGuild extends Document, SchemaTimestampsConfig {
  readonly id: string;
  settings: IGuildSettings;
  /**
   * Returns an id with the suffix appended.
   */
  prefixId(suffix: string): string;
}

export interface SGuild extends Model<IGuild> {
  /**
   * The getById will find a guild with that id and upsert if non-existent.
   */
  getById(id: string): Promise<IGuild>;
}

const guildSchema = new Schema<IGuild, SGuild>(
  {
    id,
    settings: {
      type: guildSettingsSchema,
      required: true,
      default: () => ({}), // Default to a new instance
    },
  },
  {
    statics: {
      async getById(id: string) {
        return await this.findOneAndUpdate(
          { id },
          {},
          { upsert: true, new: true },
        );
      },
    },
    methods: {
      async prefixId(suffix: string) {
        return this.id + suffix;
      },
    },
  },
);

export const Guild = model<IGuild, SGuild>("Guild", guildSchema);
