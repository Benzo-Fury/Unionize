import type { SchemaTypeOptions } from "mongoose";

export const reqString: SchemaTypeOptions<string> = {
  type: String,
  required: true,
};
