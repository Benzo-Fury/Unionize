export default function (expiration: Date) {
    if (!expiration) {
        throw new Error(
          "Expiration missing: set expiration or explicitly define maxPendingDays.",
        );
    }

    const now = new Date();
    const expirationTime = new Date(expiration).getTime();
    const durationInMillis = expirationTime - now.getTime();
  
    const days = Math.ceil(durationInMillis / (24 * 60 * 60 * 1000)); // Convert to days
    return Math.floor(days / 2); // Half of the total days

}
