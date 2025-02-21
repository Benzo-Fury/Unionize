/**
 * Converts a hex into the colors number.
 */
export function hexToNum(hex: string) {
    return parseInt(hex.replace("#", ""), 16);
}