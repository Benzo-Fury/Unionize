/**
 * Converts a duration in milliseconds to the equivalent number of days.
 */
export default function (durationInMillis: number) {
  return Math.ceil(durationInMillis / (24 * 60 * 60 * 1000));
}
