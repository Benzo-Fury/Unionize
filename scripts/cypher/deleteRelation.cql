// Deletes a relationship between 2 users

WITH $r AS rType, $gid AS gid, $uid1 AS uid1, $uid2 AS uid2

MERGE (g:Guild { id: gid })
ON CREATE SET g.createdOn = timestamp()

WITH g, rType, uid1, uid2
MERGE (u1:User { id: uid1 })-[:MEMBER_OF]->(g)
ON CREATE SET u1.createOn = timestamp()

WITH g, u1, rType, uid1, uid2
MERGE (u2:User { id: uid2 })-[:MEMBER_OF]->(g)
ON CREATE SET u2.createOn = timestamp()

WITH u1, u2, rType

CALL apoc.do.case([
  rType = 'PARTNER_OF', '
    MATCH (u1)-[r:PARTNER_OF]-(u2)
    DELETE r
  ',
  rType = 'CHILD_OF', '
    MATCH (u1)-[r:CHILD_OF]-(u2)
    DELETE r
  ',
  rType = 'PARENT_OF', '
    MATCH (u1)-[r:PARENT_OF]-(u2)
    DELETE r
  '
],
'
  RETURN null
', { u1: u1, u2: u2 }
) YIELD value

RETURN 0
