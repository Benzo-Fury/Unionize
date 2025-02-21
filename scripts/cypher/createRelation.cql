// Creates a relationship between two users.

MERGE (g:Guild { id: $gid })
ON CREATE SET
  g.createdOn = timestamp()

WITH g
MERGE (u1:User { id: $uid1 })-[:MEMBER_OF]->(g)
ON CREATE SET 
  u1.createdOn = timestamp()

WITH u1, g
MERGE (u2:User { id: $uid2 })-[:MEMBER_OF]->(g)
ON CREATE SET
  u2.createdOn = timestamp()

WITH u1, u2, $r, coalesce($p, {}) AS p
CALL apoc.merge.relationship(u1, r, {}, p, u2) YIELD r

RETURN r