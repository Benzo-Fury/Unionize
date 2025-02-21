import type {
  EmbedResponseObj,
  Parameters,
  ResponseKey,
} from "util/classes/local/LangManager";
import { Lang } from "../src/modules/events/bot/ready";

declare global {
  namespace Lang {
    function getRes<T extends "text" | "embed">(
      key: ResponseKey,
      params?: Parameters,
    ): T extends "embed" ? EmbedResponseObj : string;
  }
}
