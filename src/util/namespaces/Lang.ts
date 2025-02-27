import { Service } from "@sern/handler";
import type {
  EmbedResponseObj,
  Parameters,
  ResponseKey,
} from "../classes/local/LangManager";

export default {
  getRes<T extends "text" | "embed">(
    key: ResponseKey,
    params?: Parameters,
  ): T extends "embed" ? EmbedResponseObj : string {
    // Resolve the langManager
    const langManager = Service("langManager");

    // Return the response
    const res = langManager.getResponse(key, params);

    if (res.type === "embed") {
      return res as any;
    } else if (res.type === "random_text") { 
      if (res.content.length === 0) {
        throw new Error("Content array is empty.");
      }

      // Return random string from array
      return res.content[Math.floor(Math.random() * res.content.length)] as any;
    } else {
      return res.content as any;
    }
  }
}
