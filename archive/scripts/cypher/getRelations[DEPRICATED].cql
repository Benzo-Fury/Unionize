// Takes a user and populates all users that are in the same guild and have a relationship with that user.
// Primary user is the first user that is in the center of the trace
// Secondary user is anyone else that spans off of the primary user

// Match primary user
OPTIONAL MATCH (pu:User {id: $uid})-[:MEMBER_OF]->(g:Guild { id: $gid })

// Check user is found
WITH pu, g,
CASE 
 WHEN pu IS NULL THEN 'USER_NOT_FOUND'
 ELSE NULL
END AS error

// Return error if user is not found
WITH pu, g, error
WHERE error IS NULL
RETURN error AS errorCode

// Match all users with a direct relation and in same guild
WITH pu, g
MATCH (pu)-[rel:PARENT_OF|CHILD_OF|PARTNER_OF]-(ru:User)-[:MEMBER_OF]->(g)

// Return every user excluding primary user
RETURN ru, g AS guild