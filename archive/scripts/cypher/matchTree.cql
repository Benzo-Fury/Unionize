// Takes a user and guild ids and matches every user user who is related.
// It will return 

MATCH (su:User {id: $uid})-[:MEMBER_OF]->(g:Guild {id: $gid})

WITH su
CALL apoc.path.subgraphAll(
  su, 
  {relationshipFilter: "PARENT_OF|PARTNER_OF", maxLevel: $ml, uniqueness: "NODE_GLOBAL"} 
) YIELD nodes, relationships

RETURN nodes AS n, relationships AS r