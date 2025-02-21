// Deletes a relationship between 2 users

MERGE (g:Guild { id: $gid })
ON CREATE SET
  g.createdOn = timestamp()

OPTIONAL MATCH 
  (u1:User {id: $uid1})-[:MEMBER_OF]->(g),
  (u2:User {id: $uid2})-[:MEMBER_OF]->(g)

// Check if either user is not found
WITH u1, u2, g
WHERE u1 IS NOT NULL AND u2 IS NOT NULL // Only continuing if if both exist

// Match the relationship between the users based on the rel parameter
WITH u1, u2, r
OPTIONAL MATCH (u1)-[r]-(u2) // Biodirectional!!!!! Does not care what direction the relation was created on

// If the relationship exists, delete it
WITH r
CALL apoc.refactor.deleteRelationship(r)