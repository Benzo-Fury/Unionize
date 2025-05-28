MATCH (g:Guild {id: $gid})

WITH g
MATCH (u1:User {id: $uid})-[:MEMBER_OF]->(g)
MATCH (u1)-[:PARTNER_OF]-(u2:User)-[:MEMBER_OF]->(g)

RETURN u2 AS u