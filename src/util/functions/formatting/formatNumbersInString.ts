/**
 * Formats all numbers inside a string with locale-aware separators.
 */
export function formatNumbersInString(text: string): string {
  return text.replace(/\d+/g, (num) => Number(num).toLocaleString());
}
