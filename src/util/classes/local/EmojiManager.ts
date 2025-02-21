/**
 * Represents a emoji stored on the Discord Client
 */
export enum Emoji {
  // Reactions
  "success" = "<:success:1303256467629015070>",
  "error" = "<:error:1303256579256225792>",
  "warning" = "<:warning:1303256676639440918>",
  "info" = "<:info:1303256742251204630>",
  "wink" = "<:wink:1303256797779460106>",
  "smug" = "<:smug:1303257004210393130>",
  "snooze" = "<:snooze:1303257068039569439>",
  "surprised" = "<:surprised:1303257177095536681>",
  "starStruck" = "<:star_struck:1303257304094998528>",
  "party" = "<:party:1303257476765974528>",
  "uwu" = "<:uwu:1303257555753242644>",
  "sad" = "<:sad:1303257621767262240>",
  "moai" = "<:moai:1303257679971745874>",
  "eye_roll" = "<:eyeroll:1303257783558213652>",
  "fear_shock" = "<:fear_shock:1303257914789593142>",
  "happy" = "<:happy:1303258041533202514>",
  "laugh" = "<:laugh:1303258088140443671>",
  "ROLF" = "<:rofl:1303258147049181184>",
  "kiss" = "<:kiss:1303258212643897344>",
  "thinking" = "<:thinking:1303258289643065364>",

  // Kisses
  "kiss_iron" = "<:kiss_iron:1303894359808282654>",
  "kiss_copper" = "<:kiss_copper:1303894396621684767>",
  "kiss_silver" = "<:kiss_silver:1303894453253181561>",
  "kiss_gold" = "<:kiss_gold:1303894500913184798>",
  "kiss_platinum" = "<:kiss_platinum:1303894528557715466>",
  "kiss_diamond" = "<:kiss_diamond:1303894620056457266>",
  "kiss_stellar" = "<:kiss_stellar:1303894688062771252>",
  "kiss_nebular" = "<:kiss_nebula:1303894714625560718>",
  "kiss_supernova" = "<:kiss_supernova:1303894748591034390>",
  "kiss_cosmic" =  "<:kiss_cosmic:1303894773379108924>",
  "kiss_soulbound" = "<:kiss_soulbound:1303894794912792646>",

  // Other
  "heart" = "<:heart:1303258368034607136>",
  "ring" = "<:ring:1303258439954206722>",
  "premium" = "<:premium:1303258498305495110>",
}

/**
 * The emoji manager class that is used to store and fetch emojis. 
 * In future this will dynamically resolve emojis and store them on start.
 */
export class EmojiManager {
  public getEmoji(emoji: Emoji) {
    return emoji;
  }

  public getEmojiByKey(key: string): string | undefined {
    return Emoji[key as keyof typeof Emoji];
  }
}
