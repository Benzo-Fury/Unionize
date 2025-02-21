// Trys to match the starting and ending users along with their guild membership

OPTIONAL MATCH (su:User { id: $uid1 })-[:MEMBER_OF]->(g:Guild { id: $gid })
OPTIONAL MATCH (eu:User { id: $uid2 })-[:MEMBER_OF]->(g)

// If either user is missing, return nothing
WITH su, eu, g
WHERE su IS NOT NULL AND eu IS NOT NULL

// If both users exist, proceed to find the shortest path
WITH su, eu, g
MATCH p = shortestPath((su)-[:PARENT_OF|PARTNER_OF*]-(eu))

// Extract the nodes and relationships in the path
WITH p, nodes(p) AS pathNodes, su, eu, g
UNWIND relationships(p) AS r
WITH r, startNode(r) AS rStart, endNode(r) AS rEnd, pathNodes, su, p, g

// Calculate the direction of each relationship between the nodes in the path
WITH r, rStart, rEnd, p,
REDUCE(s = [], i IN RANGE(0, size(pathNodes)-2) |
    s +
    CASE
        WHEN pathNodes[i] = rStart AND pathNodes[i+1] = rEnd THEN ['FORWARD']
        WHEN pathNodes[i] = rEnd AND pathNodes[i+1] = rStart THEN ['BACKWARD']
        ELSE []
    END
) AS directions

// Return the transformed relationship types and path description
RETURN collect(
    CASE
        WHEN 'FORWARD' IN directions AND type(r) = 'PARENT_OF' THEN 'CHILD_OF'
        WHEN 'BACKWARD' IN directions AND type(r) = 'PARENT_OF' THEN 'PARENT_OF'
        WHEN 'FORWARD' IN directions AND type(r) = 'CHILD_OF' THEN 'PARENT_OF'
        WHEN 'BACKWARD' IN directions AND type(r) = 'CHILD_OF' THEN 'CHILD_OF'
        WHEN type(r) = 'PARTNER_OF' THEN 'PARTNER_OF'
        ELSE 'UNDEFINED'
    END
) AS p