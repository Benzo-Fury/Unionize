/**
 * Works like `keyof` except only displays the deepest keys of that type.
 */
export type DeepestKeysOf<T> = T extends object
  ? {
      [K in Extract<keyof T, string | number>]: T[K] extends object
        ? `${K}.${DeepestKeysOf<T[K]>}`
        : `${K}`;
    }[Extract<keyof T, string | number>]
  : never;
