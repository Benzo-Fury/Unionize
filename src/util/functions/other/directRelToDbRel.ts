import { DirectRelation } from "../../classes/db/neo4j/models/N4jRelation";
import type { ProposalRelation } from "../../schemas/proposal.schema";

/**
 * Converts a DirectRelation into ProposalRelation.
 */
export function directRelToDbRel(rel: DirectRelation): ProposalRelation { // <---- bad name
  switch (rel) {
    case DirectRelation.Child:
      return "child";
    case DirectRelation.Parent:
      return "parent";
    case DirectRelation.Partner:
      return "partner";
  }
}
