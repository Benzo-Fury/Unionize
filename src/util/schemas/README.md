# Structuring Mongodb Models/Schemas

This guide will show you how MongoDB models and schemas should be structured, focusing on typing, schema methods, and best practices.

## Schema Typing

All schemas should be properly typed following mongoose's [typescript guide](https://mongoosejs.com/docs/typescript.html) introduced in mongoose v5.11.0 like this:

```ts
import { type Document, model, Schema } from "mongoose";

// Represents a instanced version of the Model
export interface IUser extends Document {
  id: string;
  age: number;
}

const userSchema = new Schema<IUser>({
  id: { type: String, required: true },
  age: Number,
});

export const User = model<IUser>("User", userSchema);
```

> ℹ️ **Info**: Ensure you are extending the instanced model schema with `Document`. This will allow it to be used externally as a instanced version of the model. Using `typeof User` will assume its a static version.

## Schema Separation

Sub schemas and main schemas should be separated by comments like this:

```ts
import { type Document, model, Schema } from "mongoose";

// --------------------- Sub Schemas --------------------- //

export interface IAdress extends Document {
  country: string;
  state: string;
  // etc...
}

const addressSchema = new Schema<IAdress>({
  country: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
});

// --------------------- Main Schema --------------------- //

export interface IUser extends Document {
  id: string;
  age: number;
  address: IAdress;
}

const userSchema = new Schema<IUser>({
  id: { type: String, required: true },
  age: Number,
  address: addressSchema,
});

export const User = model<IUser>("User", userSchema);
```

## Static/Instanced Methods

Static and Instanced methods can be added to the schema and used from the model. They can be added when creating the schema like so:

```ts
import { type Document, type Model, model, Schema } from "mongoose";

// Represents a instanced version of the Model
export interface IUser extends Document {
  id: string;
  age: number;

  // Any instanced methods can be defined here

  /**
   * You can add method docs here.
   */
  suffixId(suffix: string): string;
}

// Represents a static version of the Model
export interface SUser extends Model<IUser> {
  // Any static methods should be defined here

  /**
   * You can add method docs here.
   */
  getOrUpsert(id: string): IUser;
}

const userSchema = new Schema<IUser, SUser>( // Ensure your passing in the static user interface too!
  {
    id: { type: String, required: true },
    age: Number,
  },
  {
    methods: {
      suffixId(suffix: string) {
        return this.id + suffix;
      },
    },
    statics: {
      async getOrUpsert(id: string) {
        return await this.findOneAndUpdate({ id }, {}, { upsert: true });
      },
    },
  },
);

export const User = model<IUser, SUser>("User", userSchema); // Pass static user here too!
```

## Naming Conventions for Static Methods

When creating custom static methods for finding documents, avoid using "find" in the method name. Instead, use "get" to clearly differentiate custom implementations from built-in Mongoose methods.

### Example:

- ✅ `getById(id: string): Guild;`
- ❌ `findById(id: string): Guild;`

By following this naming convention, it remains clear when a method is a custom implementation.

## Summary

- Always type schemas properly.
- Separate sub-documents and main schemas with comments.
- Use Static interface only if static methods are present.
- Instanced methods should be typed in the instantiated interface.
- Custom static methods should use "get" instead of "find".

Following these best practices will ensure clarity and maintainability in your Mongoose models and schemas.
