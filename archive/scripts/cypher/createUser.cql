// Creates a new user and links them to their guild

// Creating user (should not use merge as we can have multiple users with same id but attached to different guild)
MERGE (u:User { id: $uid, addedAt: timestamp() })

// Matching guild (will create one if non existant)
WITH u
MERGE (g:Guild { id: $gid })
ON CREATE SET
  g.addedOn = timestamp()

// Creating relationship between the guild and user
WITH u, g
MERGE (u)-[:MEMBER_OF]->(g)

// returning user
RETURN u, g