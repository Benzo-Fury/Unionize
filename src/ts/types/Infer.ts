/**
 * Infers the type from T if it matches the Pattern.
 *
 * @template T - The type to be checked against the pattern.
 * @template Pattern - The pattern to match and infer from.
 * @returns The inferred type R if T extends Pattern, otherwise never.
 */
export type Infer<T, Pattern> = T extends Pattern
  ? Pattern extends infer R
    ? R
    : never
  : never;
