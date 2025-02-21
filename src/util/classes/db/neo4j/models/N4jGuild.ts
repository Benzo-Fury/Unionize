
/**
 * Represents a server that exists in the Neo4j database.
 */
export class N4jGuild {
    constructor(
        public readonly id: string,
        /**
         * Date the guild was added to the database.
         * 
         * Representing in epoch milliseconds.
         */
        public readonly addedDate?: number,
    ) {}
}