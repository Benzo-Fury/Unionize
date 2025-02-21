
type Cypher = string;

/**
 * Dynamically creates cypher querys on the fly that can be executed in a single go.
 */
export class CypherBuilder {
    private query = ""

    public construct(constructor: (

    ) => void) {}

    private mergeUser() {}
}



// NOTE:
// Idea is that we have the constructor class that is statically used by sub files
// these sub files statically export fully defined querys that are imported and use by the interperter

// Possibly we just fully create cypher for now to get the bot running. But later we moduralize everything
// when that is done the interpreter should not change much, it should only import the querys from somewhere else.

// This is sort of like when we expand we moduralize our queries.