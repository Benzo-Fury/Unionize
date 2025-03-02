export default function (durationInMillis: number) {

    return Math.ceil(durationInMillis / (24 * 60 * 60 * 1000))
}
