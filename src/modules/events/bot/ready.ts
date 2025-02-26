import { eventModule, EventType, Service } from "@sern/handler";

export default eventModule({
  type: EventType.Discord,
  name: "ready",
  execute: async (c) => {
    // Assigning global Lang namespace
    // globalThis.Lang = Lang;
  },
});
