import { CommandControlPlugin, CommandType, controller } from "@sern/handler";
import type { DirectRelation } from "../../classes/db/neo4j/models/N4jRelation";

/**
 * Used to store a DirectRelation in the modules state under "relationType"
 */
export function storeRelation(rel: DirectRelation) {
  return CommandControlPlugin<CommandType.Slash>((ctx, sdt) => {
    return controller.next({ relationType: rel });
  });
}
