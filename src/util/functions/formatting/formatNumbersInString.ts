export function formatNumbersInString(text: string): string {
  return text.replace(/\d+/g, (num) => Number(num).toLocaleString());
}
