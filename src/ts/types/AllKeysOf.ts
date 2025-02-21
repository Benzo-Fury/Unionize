/**
 * Works like `keyof` except includes all of the nested keys too.
 */
export type AllKeysOf<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | `${K}.${AllKeysOf<T[K]>}`
        : never;
    }[keyof T]
  : never;
