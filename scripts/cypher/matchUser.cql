// Takes an id and matches it to a user, also returns all the users direct relationships 

MERGE (g:Guild { id: $gid })
ON CREATE SET
  g.addedOn = timestamp()

WITH g
MERGE (u:User { id: $uid })-[:MEMBER_OF]->(g)
ON CREATE SET
  u.addedOn = timestamp()

WITH g, u
MATCH (ru:User)-[r:PARENT_OF|PARTNER_OF]-(u)-[:MEMBER_OF]->(g)

WITH g, u, collect({ id: ru.id, rel: type(r) }) AS rels
RETURN 
{
  id: u.id,
  rels: rels
} AS u, g
