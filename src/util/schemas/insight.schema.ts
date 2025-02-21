import config from "#config";
import { type Document, model, Schema, Types } from "mongoose";
import { id } from "./templates/id";
import { reqString } from "./templates/reqString";

export type InsightType = "tip" | "fact" | "other";

export interface IInsight extends Document {
  readonly _id: Types.ObjectId;
  type: InsightType;
  content: string;
  priority: number;
  iconUrl?: string;
  readonly addedBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const insightSchema = new Schema<IInsight>({
  // Errors only came on after adding <IInsight>
  type: {
    type: String, // Seems using reqString here gives an error due to us also using an enum. Perhaps add to docs somewhere.
    required: true,
    enum: ["fact", "tip", "other"] as InsightType[],
  },
  content: {
    ...reqString,
    maxlength: config.database.collections.insight.maxLength,
  },
  priority: {
    type: Number,
    required: true,
    default: 1,
  },
  iconUrl: {
    type: String,
  },
  addedBy: {
    ...id,
    unique: false,
    index: false,
  },
});

export const InsightModel = model<IInsight>("Insight", insightSchema);
