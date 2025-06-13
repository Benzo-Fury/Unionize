/**
 * Extracts the first character of a string type.
 *
 * @template T - The string type to extract the first character from.
 * @returns The first character of the string, or never if T is not a string.
 *
 * @example
 *   type A = FirstChar<"Hello">; // "H"
 *   type B = FirstChar<"">;      // never
 */
export type FirstChar<T extends string> = T extends `${infer F}${string}`
  ? F
  : never;
