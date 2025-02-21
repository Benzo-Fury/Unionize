import {
  type Document,
  model,
  Schema,
  type SchemaTimestampsConfig,
  Types,
} from "mongoose";
import type { IGuild } from "./guild.schema";

export interface IUser extends Document, SchemaTimestampsConfig {
  id: string;
  guild: Types.ObjectId | IGuild;
}

export const userSchema = new Schema<IUser>({
  id: {
    type: String,
    required: true,
    immutable: true,
  },
  guild: {
    type: Schema.Types.ObjectId,
    required: true,
    immutable: true,
    ref: "Guild",
  },
});

// Create a unique compound index on the user and guild ids
userSchema.index({ id: 1, guild: 1 }, { unique: true });

export const UserModel = model<IUser>("User", userSchema);
