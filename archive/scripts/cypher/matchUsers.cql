// Takes an array of snowflake user objects and matches them all

UNWIND $uids AS uid

OPTIONAL MATCH (u:User { id: uid })-[:MEMBER_OF]->(g:Guild { id: $gid })

RETURN u, g