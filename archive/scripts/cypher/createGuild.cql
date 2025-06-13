// Creates a new guild

// Creating local variables
WITH coalesce($premium, false) AS isPremium

// Creating guild. Using merge as there should never be more than one guild with the same id
MERGE (g:Guild { id: $gid })
  ON CREATE SET g.premium = isPremium, g.addedAt = timestamp()

RETURN g
