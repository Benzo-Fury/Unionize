

WITH $uid AS uid, $r AS rT, $rev AS rev
CALL apoc.do.when(
  rev,
  '
  MERGE (g:Guild { id: $gid })
  ON CREATE SET g.createdOn = timestamp()

  WITH g
  MERGE (pu:User { id: $uid })-[:MEMBER_OF]->(g)
    ON CREATE SET pu.createdOn = timestamp()

  WITH pu, $rT AS rT
  CALL apoc.cypher.run(
    "MATCH (pu)-[r:"+rT+"]->(su) RETURN su AS u",
    { pu: pu }
  ) YIELD value
  RETURN value.u AS u
  ',
  '
  MERGE (g:Guild { id: $gid })
    ON CREATE SET g.createdOn = timestamp()

  WITH g
  MERGE (su:User { id: $uid })-[:MEMBER_OF]->(g)
    ON CREATE SET su.createdOn = timestamp()

  WITH su, $rT AS rT
  CALL apoc.cypher.run(
    "MATCH (pu)-[r:"+rT+"]->(su) RETURN pu AS u",
    { su: su }
  ) YIELD value
  RETURN value.u AS u
  ',
  { uid: uid, gid: $gid, rT: rT }
) YIELD value

RETURN value.u AS u
