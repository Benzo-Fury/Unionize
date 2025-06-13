MERGE (g:Guild {id: $gid})
ON CREATE SET
  g.createdOn = timestamp()

WITH g
MERGE (u:User {id: $uid})-[:MEMBER_OF]->(g)
ON CREATE SET
  u.createdOn = timestamp()

WITH u, $rT AS relType, $rev AS reverse

CALL apoc.do.when(
  reverse,
  'MATCH (u)<-[r:`'+relType+'`]-() DELETE r',
  'MATCH ()-[r:`'+relType+'`]->(u) DELETE r',
  {u: u, relType: relType}
)

RETURN 0
