// Takes 2 users and returns a direct relation between the 2

MERGE (g:Guild { id: $gid })
ON CREATE SET
  g.addedOn = timestamp()

WITH g
MERGE (u1:User { id: $uid1 })-[:MEMBER_OF]->(g)
ON CREATE SET
  u1.addedOn = timestamp()

WITH g, u1
MERGE (u2:User { id: $uid2 })-[:MEMBER_OF]->(g)
ON CREATE SET
  u2.addedOn = timestamp()

WITH g, u1, u2
MATCH (u1)-[r]->(u2) // DIRECTIONAL!!!!! Does take into concideration relation directions

RETURN r