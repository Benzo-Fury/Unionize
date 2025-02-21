import { type SchemaTypeOptions } from "mongoose";

export const id: SchemaTypeOptions<string> = {
  type: String,
  required: true,
  unique: true,
  immutable: true,
  index: true,
};
