/**
 * Lazily filters an array based on a provided predicate function.
 *
 * This function uses a generator to yield items from the array that match
 * the filter condition without creating a new array in memory. Useful for
 * processing large datasets or when lazy evaluation is required.
 */
export function* lazyFilterArray<I extends any>(
  array: I[],
  predicate: (item: I) => boolean,
) {
  for (const item of array) {
    if (predicate(item)) {
      yield item; // Yield only items that match the predicate
    }
  }
}
