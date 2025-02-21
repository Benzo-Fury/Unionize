import { commandModule } from "#cmdModule";
import { CommandType } from "@sern/handler";

export default commandModule({
  name: "ping",
  type: CommandType.Slash,
  plugins: [],
  description: "A ping command",
  execute: async (ctx, sdt) => {
    return ctx.reply("Powng!");
  },
});
